const dbStore = require('../services/dbStore');
const realtimeService = require('../services/realtimeService');

// Get all registered users and conversation previews sorted by latest message
const getConversationsList = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    const conversations = dbStore.getConversationsForUser(currentUsername);
    return res.json({
      success: true,
      conversations
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Get conversation messages and check messaging permission
const getConversation = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    const { username: targetUsername } = req.params;

    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    if (!targetUsername) {
      return res.status(400).json({ success: false, error: { message: 'Target username is required.' } });
    }

    const targetUser = dbStore.getUser(targetUsername);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: { message: `User @${targetUsername} not found.` } });
    }

    const perm = dbStore.canUserMessage(currentUsername, targetUsername);
    const messages = perm.canMessage ? dbStore.getMessages(currentUsername, targetUsername) : [];

    // Mark incoming messages as read
    if (perm.canMessage) {
      dbStore.markMessagesAsRead(currentUsername, targetUsername);
    }

    return res.json({
      success: true,
      canMessage: perm.canMessage,
      isPrivate: perm.isPrivate,
      requestStatus: perm.requestStatus,
      targetUser: {
        username: targetUser.username,
        displayName: targetUser.displayName || targetUser.username,
        avatar: targetUser.customAvatarUrl || targetUser.avatar || '👤',
        role: targetUser.role,
        privacy: targetUser.privacy || 'PUBLIC'
      },
      messages
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Send a direct message
const sendMessage = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    const { username: targetUsername } = req.params;
    const { text, type = 'text', mediaUrl = '' } = req.body || {};

    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Message text cannot be empty.' } });
    }

    const perm = dbStore.canUserMessage(currentUsername, targetUsername);
    if (!perm.canMessage) {
      return res.status(403).json({
        success: false,
        isPrivate: true,
        requestStatus: perm.requestStatus,
        error: {
          code: 'PRIVATE_RESTRICTION',
          message: `This account is private. Please send a message request first and wait for @${targetUsername} to accept.`
        }
      });
    }

    const msg = dbStore.addMessage({
      sender: currentUsername,
      receiver: targetUsername,
      text: text.trim(),
      type,
      mediaUrl
    });

    // Real-time broadcast via SSE
    try {
      if (realtimeService && typeof realtimeService.broadcast === 'function') {
        realtimeService.broadcast('NEW_DIRECT_MESSAGE', {
          id: msg.id,
          sender: currentUsername,
          receiver: targetUsername,
          text: msg.text,
          type: msg.type,
          timestamp: msg.timestamp
        });
      }
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: msg
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Send message/follow request to a private profile
const sendChatRequest = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    const { username: targetUsername } = req.params;

    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    if (currentUsername.toLowerCase() === targetUsername.toLowerCase()) {
      return res.status(400).json({ success: false, error: { message: 'Cannot send request to yourself.' } });
    }

    const targetUser = dbStore.getUser(targetUsername);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: { message: `User @${targetUsername} not found.` } });
    }

    const reqObj = dbStore.sendChatRequest(currentUsername, targetUsername);

    // Broadcast realtime event
    try {
      if (realtimeService && typeof realtimeService.broadcast === 'function') {
        realtimeService.broadcast('NEW_CHAT_REQUEST', {
          id: reqObj.id,
          from: currentUsername,
          to: targetUsername,
          timestamp: reqObj.requestedAt
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      request: reqObj,
      message: `Message request sent to @${targetUsername}. Waiting for approval! ✨`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Accept or decline incoming chat request
const respondChatRequest = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    const { requestId, fromUsername, status } = req.body || {};

    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    const targetStatus = status === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
    const targetId = requestId || fromUsername;

    const result = dbStore.respondChatRequest(targetId, targetStatus, currentUsername);
    if (!result) {
      return res.status(404).json({ success: false, error: { message: 'Request not found or unauthorized.' } });
    }

    // Broadcast realtime event
    try {
      if (realtimeService && typeof realtimeService.broadcast === 'function') {
        realtimeService.broadcast('CHAT_REQUEST_RESPONDED', {
          from: result.from,
          to: result.to,
          status: result.status
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      status: result.status,
      message: result.status === 'ACCEPTED' ? `Accepted message request from @${result.from}! 💖` : `Declined request.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

const notificationService = require('../services/notificationService');
const zegoService = require('../services/zegoService');

const activeCalls = new Map(); // callId -> call record

function formatCallDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Get ZEGOCLOUD Calling Configuration and Token
const getZegoConfig = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.username) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }
    const { roomId } = req.query || {};
    const config = zegoService.getZegoConfig(user, roomId);
    return res.json({
      success: true,
      config
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Initiate Audio or Video Call
const initiateCall = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    const { targetUsername, callType = 'video' } = req.body || {};

    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    if (!targetUsername) {
      return res.status(400).json({ success: false, error: { message: 'Target username is required.' } });
    }

    if (currentUsername.toLowerCase() === targetUsername.toLowerCase()) {
      return res.status(400).json({ success: false, error: { message: 'Cannot call yourself.' } });
    }

    const targetUser = dbStore.getUser(targetUsername);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: { message: `User @${targetUsername} not found.` } });
    }

    const perm = dbStore.canUserMessage(currentUsername, targetUsername);
    if (!perm.canMessage) {
      return res.status(403).json({
        success: false,
        error: { message: `Cannot call @${targetUsername}. Message request must be approved first.` }
      });
    }

    const callerUser = dbStore.getUser(currentUsername) || req.user;
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const roomId = `zego_room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const callRecord = {
      id: callId,
      roomId,
      caller: currentUsername,
      callerDisplayName: callerUser.displayName || currentUsername,
      callerAvatar: callerUser.customAvatarUrl || callerUser.avatar || '👤',
      target: targetUser.username,
      targetDisplayName: targetUser.displayName || targetUser.username,
      targetAvatar: targetUser.customAvatarUrl || targetUser.avatar || '👤',
      callType: callType === 'voice' ? 'voice' : 'video',
      status: 'RINGING',
      createdAt: new Date().toISOString()
    };

    activeCalls.set(callId, callRecord);

    // 1. Broadcast INCOMING_CALL via SSE to recipient
    try {
      if (realtimeService && typeof realtimeService.broadcast === 'function') {
        realtimeService.broadcast('INCOMING_CALL', {
          callId,
          roomId,
          caller: currentUsername,
          callerDisplayName: callerUser.displayName || currentUsername,
          callerAvatar: callerUser.customAvatarUrl || callerUser.avatar || '👤',
          target: targetUser.username,
          callType: callRecord.callType,
          timestamp: callRecord.createdAt
        });
      }
    } catch (e) {}

    // 2. Dispatch Mobile Push & Phone Alert
    try {
      if (notificationService && typeof notificationService.sendCallNotification === 'function') {
        notificationService.sendCallNotification({
          callerName: callerUser.displayName || currentUsername,
          targetUser,
          callType: callRecord.callType,
          status: 'INCOMING'
        });
      }
    } catch (e) {}

    return res.json({
      success: true,
      callId,
      roomId,
      call: callRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Respond to Call (ACCEPT, REJECT, BUSY, MISSED, END)
const respondCall = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    const { callId, action, targetUsername, callType = 'video', durationSeconds = 0 } = req.body || {};

    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    const callRecord = activeCalls.get(callId);
    const resolvedTarget = targetUsername || (callRecord ? (callRecord.caller.toLowerCase() === currentUsername.toLowerCase() ? callRecord.target : callRecord.caller) : '');
    const resolvedType = callType || (callRecord ? callRecord.callType : 'video');
    const roomId = callRecord ? callRecord.roomId : '';

    if (callRecord) {
      callRecord.status = action;
      if (action === 'END' || action === 'REJECT' || action === 'MISSED' || action === 'BUSY') {
        activeCalls.delete(callId);
      }
    }

    // Broadcast CALL_RESPONSE via SSE to both peers
    try {
      if (realtimeService && typeof realtimeService.broadcast === 'function') {
        realtimeService.broadcast('CALL_RESPONSE', {
          callId,
          roomId,
          action,
          from: currentUsername,
          target: resolvedTarget,
          callType: resolvedType,
          durationSeconds,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {}

    // Auto-create chat notification / Call Log Message in message thread
    if (resolvedTarget) {
      if (action === 'END' && durationSeconds > 0) {
        const durStr = formatCallDuration(durationSeconds);
        const logText = (resolvedType === 'voice') 
          ? `📞 Voice Call (${durStr})` 
          : `📹 Video Call (${durStr})`;
        
        const logMsg = dbStore.addMessage({
          sender: currentUsername,
          receiver: resolvedTarget,
          text: logText,
          type: 'call_log',
          mediaUrl: resolvedType
        });

        // Broadcast new message event
        try {
          if (realtimeService && typeof realtimeService.broadcast === 'function') {
            realtimeService.broadcast('NEW_DIRECT_MESSAGE', {
              id: logMsg.id,
              sender: logMsg.sender,
              receiver: logMsg.receiver,
              text: logMsg.text,
              type: logMsg.type,
              timestamp: logMsg.timestamp
            });
          }
        } catch (e) {}
      } else if (action === 'MISSED' || action === 'REJECT') {
        const callerName = callRecord ? callRecord.caller : resolvedTarget;
        const receiverName = callRecord ? callRecord.target : currentUsername;
        const missText = (resolvedType === 'voice') 
          ? `⚠️ Missed Voice Call` 
          : `⚠️ Missed Video Call`;

        const missMsg = dbStore.addMessage({
          sender: callerName,
          receiver: receiverName,
          text: missText,
          type: 'call_missed',
          mediaUrl: resolvedType
        });

        // Broadcast missed call message event
        try {
          if (realtimeService && typeof realtimeService.broadcast === 'function') {
            realtimeService.broadcast('NEW_DIRECT_MESSAGE', {
              id: missMsg.id,
              sender: missMsg.sender,
              receiver: missMsg.receiver,
              text: missMsg.text,
              type: missMsg.type,
              timestamp: missMsg.timestamp
            });
          }
        } catch (e) {}

        // Push missed call alert
        try {
          const targetUser = dbStore.getUser(receiverName);
          if (notificationService && typeof notificationService.sendCallNotification === 'function') {
            notificationService.sendCallNotification({
              callerName,
              targetUser,
              callType: resolvedType,
              status: 'MISSED'
            });
          }
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      action,
      callId
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// WebRTC Signaling Relay (SDP Offer/Answer & ICE Candidates)
const signalWebRTC = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    const { callId, targetUsername, signalData } = req.body || {};

    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    if (!targetUsername || !signalData) {
      return res.status(400).json({ success: false, error: { message: 'Target username and signalData are required.' } });
    }

    try {
      if (realtimeService && typeof realtimeService.broadcast === 'function') {
        realtimeService.broadcast('CALL_WEBRTC_SIGNAL', {
          callId,
          from: currentUsername,
          target: targetUsername,
          signalData,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {}

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Get pending incoming requests for current user
const getPendingRequests = async (req, res) => {
  try {
    const currentUsername = req.user?.username;
    if (!currentUsername) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
    }

    const requests = dbStore.getPendingRequestsForUser(currentUsername);
    return res.json({
      success: true,
      requests
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

module.exports = {
  getConversationsList,
  getConversation,
  sendMessage,
  sendChatRequest,
  respondChatRequest,
  getPendingRequests,
  getZegoConfig,
  initiateCall,
  respondCall,
  signalWebRTC
};
