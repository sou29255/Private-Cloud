// Private Photo Cloud - AI Assistant Knowledge Base & Natural Language Query Controller

const WEBSITE_KNOWLEDGE = [
  {
    topic: 'upload',
    keywords: ['upload', 'add photo', 'post', 'save photo', 'image upload', 'ছবি আপলোড', 'আপলোড', 'ফটো আপলোড', 'ছবি যোগ'],
    english: `To upload photos to the cloud:\n1. Click the **➕ Upload** button in the topbar, sidebar, or hero banner.\n2. Choose or drag-and-drop JPG, PNG, or WebP images.\n3. The system automatically processes images with **Lanczos3 HD scaling** and auto-rotates phone camera orientation.\n4. Click **Start Upload** to securely store in the 10.4 TB cloud vault!`,
    bengali: `ফটো আপলোড করার নিয়ম:\n১. টপবার, সাইডবার বা হোম ব্যানারের **➕ Upload** বাটনে ক্লিক করুন।\n২. আপনার ফোন বা কম্পিউটার থেকে ছবি সিলেক্ট করুন বা ড্র্যাগ করুন।\n৩. সিস্টেম স্বয়ংক্রিয়ভাবে ছবিগুলোকে **Lanczos3 HD কোয়ালিটিতে** প্রসেস করবে।\n৪. **Start Upload** এ ক্লিক করলেই ছবিটি ক্লাউড ভল্টে সেভ হয়ে যাবে!`,
    action: { text: '➕ Open Upload Modal', action: 'open_upload' }
  },
  {
    topic: 'crop_avatar',
    keywords: ['crop', 'fit photo', 'profile picture', 'avatar', 'adjust photo', 'rotate', 'zoom', 'ক্রপ', 'ছবি ফিট', 'প্রোফাইল পিকচার', 'ঘোরানো', 'জুম'],
    english: `To set and fit your Profile Picture perfectly:\n1. Go to your **Profile Hub**.\n2. Click the **📷 Camera badge** over your avatar.\n3. The **Interactive Photo Fitter** screen will open:\n   - **🖱️ Drag**: Move the photo to center your face.\n   - **🔍 Zoom**: Slider adjusts size from 20% to 350%.\n   - **↺ Rotate**: Fix orientation by -90° or +90°.\n   - **👁️ Live Preview**: Check the circular preview at the bottom right.\n4. Click **✨ Save Profile Picture** for a crystal-clear 512x512 HD avatar!`,
    bengali: `প্রোফাইল ফটো নিখুঁতভাবে ফিট ও ক্রপ করার নিয়ম:\n১. আপনার **Profile Hub** এ যান।\n২. প্রোফাইল ছবির ওপরের **📷 ক্যামেরা বাটনে** ক্লিক করে ছবি বেছে নিন।\n৩. সাথে সাথেই **Adjust & Fit Screen** খুলে যাবে:\n   - **🖱️ Drag**: ছবি টেনে ফ্রেমের মাঝে বসান।\n   - **🔍 Zoom**: স্লাইডার দিয়ে ২০% থেকে ৩৫০% পর্যন্ত জুম করুন।\n   - **↺ Rotate**: বাঁকা ছবি সোজা করতে -90° বা +90° ঘুরিয়ে নিন।\n   - **👁️ Live Preview**: নিচে ছোট গোল বক্সে রিয়েল-টাইম প্রিভিউ দেখুন।\n৪. **✨ Save Profile Picture** এ ক্লিক করলেই ক্রিস্টাল ক্লিয়ার এইচডি ছবি সেভ হয়ে যাবে!`,
    action: { text: '👤 Go to Profile Hub', action: 'open_profile' }
  },
  {
    topic: 'music',
    keywords: ['music', 'song', 'player', 'play', 'mp3', 'download song', 'speed', 'মিউজিক', 'গান', 'প্লেয়ার', 'অডিও', 'ডাউনলোড গান', 'স্পিড'],
    english: `The **Music Vault** includes:\n- **14 Curated High-Fidelity Songs** (Romantic ❤️, Sad 🌧️, and Enjoyful 🍃 tracks).\n- **Speed Control**: Adjust playback from 0.5x up to 2.0x speed.\n- **MP3 Download**: Click **⬇️ Download** on any song to save it offline.\n- **Live Glow Animation**: Cards glow and pulse while audio is playing.`,
    bengali: `**Music Vault (মিউজিক প্লেয়ার)** এর সুবিধাসমূহ:\n- **১৪টি দুর্দান্ত গান** রয়েছে (Romantic ❤️, Sad 🌧️ এবং Enjoyful 🍃 গান)।\n- **Speed Controller**: গানের গতি ০.৫x থেকে ২.০x পর্যন্ত বাড়াতে বা কমাতে পারবেন।\n- **MP3 Download**: যেকোনো গানের **⬇️ Download** বাটনে ক্লিক করে অফলাইনে সেভ করতে পারবেন।\n- **Live Pulse Glow**: গান চলার সময় কার্ডটিতে লাইভ গ্লো ও বিট অ্যানিমেশন চলবে।`,
    action: { text: '🎵 Open Music Vault', action: 'open_music' }
  },
  {
    topic: 'profile_hub',
    keywords: ['profile', 'timeline', 'follow', 'following', 'bio', 'followers', 'প্রোফাইল', 'টাইমলাইন', 'ফলো', 'বায়ো'],
    english: `The **Dedicated Personal Profile Hub** allows each member to:\n- Have a personalized page with cover gradient banner, custom avatar, and bio.\n- See total upload count, likes received, and joined date.\n- **Follow / Unfollow** other members with real-time counters.\n- Browse personal grid and chronological social timeline of uploaded memories.`,
    bengali: `**Personal Profile Hub** এর বৈশিষ্ট্যসমূহ:\n- প্রত্যেক সদস্যের নিজস্ব পেজ, কভার ব্যানার, কাস্টম প্রোফাইল পিক ও বায়ো থাকবে।\n- মোট আপলোড সংখ্যা, লাইক সংখ্যা এবং যুক্ত হওয়ার তারিখ দেখা যাবে।\n- অন্য সদস্যদের **Follow / Unfollow** করা যাবে এবং ফলোয়ার কাউন্টার লাইভ আপডেট হবে।\n- নিজের আপলোড করা ফটোগুলোর গ্রিড ও সোশ্যাল টাইমলাইন দেখা যাবে।`,
    action: { text: '👤 View Profile Hub', action: 'open_profile' }
  },
  {
    topic: 'social',
    keywords: ['like', 'comment', 'love', 'heart', 'emoji', 'লাইক', 'কমেন্ট', 'মন্তব্য', 'ভালোবাসা', 'ইমোজি'],
    english: `Social Engagement Features:\n- **❤️ Likes**: Click the heart button on any photo card or viewer to leave love reactions.\n- **💬 Comments**: Open any photo to view and write comments or click quick reaction emojis (❤️, 🔥, 😍, 👏, ✨).\n- **Tactile Sounds**: Every like triggers a sparkling chime sound!`,
    bengali: `সোশ্যাল এনগেজমেন্ট ফিচারসমূহ:\n- **❤️ লাইক**: যেকোনো ছবির কার্ডে বা ভিউয়ারে হার্ট আইকনে ক্লিক করলেই লাইক যুক্ত হবে।\n- **💬 কমেন্ট**: ছবিতে ক্লিক করে যেকোনো মন্তব্য লিখতে পারবেন বা কুইক ইমোজি (❤️, 🔥, 😍, 👏, ✨) দিতে পারবেন।\n- **সাউন্ড ইফেক্ট**: প্রতিটি লাইকের সাথে একটি মিষ্টি বাবল-পপ সাউন্ড বাজবে!`,
    action: { text: '📸 Explore Memories', action: 'open_dashboard' }
  },
  {
    topic: 'admin',
    keywords: ['admin', 'soumya', 'sumana', 'sumona', 'vip', 'manage user', 'delete user', 'head admin', 'অ্যাডমিন', 'সৌমা', 'সুমানা', 'সুমনা', 'ভিআইপি', 'ইউজার ডিলিট'],
    english: `User Management & Roles:\n- **👑 Head Admin (Soumya)**: Can manage all users, review server health, and delete inappropriate user profiles via the **Manage Users** dashboard.\n- **💖 Protected VIP (Sumana)**: A permanently protected VIP account that is immune to deletion or alteration by anyone.\n- **👤 Regular Members**: Can create accounts, upload photos, customize avatars, and participate.`,
    bengali: `ইউজার ও রোল ম্যানেজমেন্ট:\n- **👑 Head Admin (Soumya)**: সমস্ত ইউজার ম্যানেজ করতে পারেন এবং প্রয়োজন অনুযায়ী ইউজার বোর্ড থেকে ইউজার পরিচালনা করতে পারেন।\n- **💖 Protected VIP (Sumana)**: একটি সুরক্ষিত ভিআইপি অ্যাকাউন্ট যা কখনোই ডিলিট বা পরিবর্তন করা যায় না (সম্পূর্ণ সুরক্ষিত)।\n- **👤 সাধারণ সদস্য**: অ্যাকাউন্ট তৈরি, ফটো আপলোড, ক্রপিং এবং সোশ্যাল ইন্টারঅ্যাকশন করতে পারেন।`,
    action: { text: '👑 Open User Manager', action: 'open_user_manager' }
  },
  {
    topic: 'notification',
    keywords: ['notification', 'alert', 'phone', 'message', '9239425276', 'ntfy', 'নোটিফিকেশন', 'অ্যালার্ট', 'মেসেজ', 'ফোন'],
    english: `Instant Phone Alert System:\n- Whenever a photo is uploaded or deleted, an instant push notification is transmitted directly to phone **+919239425276** via ntfy service.\n- Web browser push notifications are also dispatched to active clients.`,
    bengali: `ইনস্ট্যান্ট ফোন অ্যালার্ট সিস্টেম:\n- যখনই কোনো ফটো আপলোড বা ডিলিট করা হয়, সাথে সাথে **+919239425276** নম্বরে ইনস্ট্যান্ট পুশ নোটিফিকেশন অ্যালার্ট পৌঁছে যায়।\n- ব্রাউজারেও রিয়েল-টাইম নোটিফিকেশন শো করে।`,
    action: null
  },
  {
    topic: 'security',
    keywords: ['security', 'login', 'password', 'vault', 'two stage', 'লগইন', 'পাসওয়ার্ড', 'ভল্ট', 'সিকিউরিটি', 'নিরাপত্তা'],
    english: `Two-Stage Cloud Security:\n1. **Stage 1 (Vault Master Key)**: Guards the entire private cloud gateway.\n2. **Stage 2 (Personal Profile Passwords)**: Each member logs into their own personal space with their private password.\n- Offline encrypted local storage fallback ensures 100% uptime even without external DB.`,
    bengali: `টু-স্টেজ সিকিউরিটি সিস্টেম:\n১. **প্রথম ধাপ (Master Key)**: মূল ক্লাউড গেটওয়ে আনলক করতে মাস্টার পাসওয়ার্ড লাগে।\n২. **দ্বিতীয় ধাপ (Profile Password)**: প্রতিটি সদস্যের নিজস্ব প্রোফাইলে লগইন করার জন্য আলাদা প্রাইভেট পাসওয়ার্ড থাকে।\n- অফলাইন ও লোকাল ফাস্ট স্টোরেজের মাধ্যমে সাইটটি সর্বদা ১০০% সচল থাকে।`,
    action: null
  },
  {
    topic: 'shortcuts',
    keywords: ['shortcut', 'keyboard', 'ctrl k', 'escape', 'keys', 'শর্টকাট', 'কিবোর্ড'],
    english: `Keyboard Shortcuts:\n- **Ctrl + K** or **Cmd + K**: Open Instant Command Palette.\n- **Escape**: Close any modal or photo viewer.\n- **Left / Right Arrow**: Navigate photos in full-screen viewer.\n- **F / Space**: Toggle favorite / like on active photo.`,
    bengali: `কিবোর্ড শর্টকাট:\n- **Ctrl + K** বা **Cmd + K**: কমান্ড প্যালেট ওপেন করুন।\n- **Escape**: যেকোনো পপআপ বা ভিউয়ার বন্ধ করুন।\n- **Left / Right Arrow**: ফুলস্ক্রিন ভিউয়ারে আগের বা পরের ছবি দেখুন।`,
    action: { text: '⌨️ Open Command Palette', action: 'open_command_palette' }
  },
  {
    topic: 'help_support',
    keywords: ['help', 'contact', 'support', 'issue', 'problem', 'report', 'message admin', 'email', 'সাহায্য', 'হেল্প', 'সমস্যা', 'মেসেজ', 'যোগাযোগ', 'অ্যাডমিন হেল্প', 'অভিযোগ'],
    english: `You can reach out directly to the Head Admin via our **Admin Help Desk**:\n1. Click **🎧 Admin Help Desk** in the sidebar or below.\n2. Choose your issue topic (Photo upload, Music player, Account help, Bug report, etc.).\n3. Describe what happened and click **🚀 Send Message to Admin**.\n4. Your message will be securely dispatched to the Head Admin immediately!`,
    bengali: `যেকোনো সমস্যা বা সহায়তার জন্য আপনি সরাসরি হেড অ্যাডমিনের সাথে যোগাযোগ করতে পারেন:\n১. সাইডবার বা নিচের **🎧 Admin Help Desk** এ ক্লিক করুন।\n২. আপনার সমস্যার বিষয় বা ক্যাটাগরি বেছে নিন।\n৩. আপনার সমস্যাটি বিস্তারিত লিখে **🚀 Send Message to Admin** বাটনে চাপুন।\n৪. আপনার মেসেজটি সাথে সাথে নিরাপদে হেড অ্যাডমিনের কাছে পৌঁছে যাবে!`,
    action: { text: '🎧 Open Admin Help Desk', action: 'open_support' }
  },
  {
    topic: 'messaging_calling',
    keywords: ['message', 'chat', 'direct message', 'call', 'video call', 'voice call', 'inbox', 'talk', 'কথা', 'মেসেজ', 'চ্যাট', 'কল', 'ভিডিও কল', 'ভয়েস কল', 'যোগাযোগ', 'মেসেঞ্জার'],
    english: `Direct Profile Messaging & Calling 💬📞:\n- **1-on-1 Chat**: Open any member's Profile Hub and click **💬 Message** to start a real-time conversation!\n- **Privacy & Requests**: If a profile is Public, you can message immediately. If Private, you can send a friendly **Message Request**; once they accept, the chat & photos unlock!\n- **📞 Voice & 📹 Video Calling**: Enjoy interactive calling with live ringtones, camera toggle, and calling screen directly from the messenger header!`,
    bengali: `ডিরেক্ট প্রোফাইল মেসেজিং ও কলিং সুবিধা 💬📞:\n- **১-অন-১ চ্যাট**: যেকোনো সদস্যের প্রোফাইল হাবে গিয়ে **💬 Message** বাটনে ক্লিক করে সরাসরি কথা বলুন!\n- **প্রাইভেসি ও রিকোয়েস্ট**: পাবলিক অ্যাকাউন্টে সাথে সাথেই মেসেজ করা যায়। প্রাইভেট অ্যাকাউন্টে **Message Request** পাঠানো যায়—তারা অ্যাকসেপ্ট করলেই চ্যাট ও ফটো আনলক হয়ে যাবে!\n- **📞 ভয়েস ও 📹 ভিডিও কল**: মেসেঞ্জারের ওপরের কল বাটনে ক্লিক করে সরাসরি ভয়েস ও ভিডিও কল ইন্টারফেস ব্যবহার করতে পারবেন!`,
    action: { text: '👤 Explore Member Profiles', action: 'open_profile' }
  },
  {
    topic: 'birthday_celebration',
    keywords: ['birthday', 'happy birthday', 'wish', 'cake', 'celebration', 'জন্মদিন', 'হ্যাপি বার্থডে', 'উইশ', 'জন্মদিনের শুভেচ্ছা', 'বার্থডে'],
    english: `Birthday Wishes & Celebrations 🎂🎉:\n- **Automatic Birthday Surprise**: On your special birthday, a deluxe celebration card with confetti bursts, sparkles, and festive music lights up your screen!\n- **SMS Push Greetings**: A personalized Birthday Wish SMS and phone alert is dispatched directly to your mobile number!\n- **Preview Anytime**: Visit your Profile Hub to test and preview the Birthday Wish celebration!`,
    bengali: `জন্মদিনের শুভেচ্ছা ও স্পেশাল সেলিব্রেশন 🎂🎉:\n- **অটোমেটিক বার্থডে সারপ্রাইজ**: আপনার জন্মদিনে প্রোফাইল খুললেই চমৎকার কনফেটি অ্যানিমেশন ও শুভেচ্ছা কার্ড ভেসে উঠবে!\n- **SMS ও ফোন অ্যালার্ট**: জন্মদিনের সুন্দর শুভেচ্ছা বার্তা সরাসরি আপনার রেজিস্টার্ড ফোন নম্বরে SMS ও পুশ অ্যালার্ট হিসেবে চলে যাবে!\n- **প্রিভিউ দেখুন**: আপনার প্রোফাইল হাবে গিয়ে যেকোনো সময় বার্থডে সেলিব্রেশনের লাইভ প্রিভিউ দেখতে পারেন!`,
    action: { text: '🎂 Preview Birthday Wish', action: 'preview_birthday' }
  },
  {
    topic: 'phone_security',
    keywords: ['phone', 'number', 'mobile', 'change number', 'update phone', 'ফোন নম্বর', 'মোবাইল', 'নম্বর পরিবর্তন', 'নম্বর আপডেট'],
    english: `Phone Number Privacy & Settings 📱🔒:\n- **Strict Privacy**: Your mobile number is 100% private and can ONLY be viewed by **👑 Soumya (Head Admin)** and yourself.\n- **Change Number with Password**: Need to update your number? Go to Profile Hub Settings, enter your new 10-digit number and current password to update it instantly!`,
    bengali: `ফোন নম্বর সিকিউরিটি ও পরিবর্তন 📱🔒:\n- **সম্পূর্ণ সুরক্ষিত**: আপনার ফোন নম্বরটি সম্পূর্ণ প্রাইভেট এবং এটি একমাত্র **👑 Soumya (Head Admin)** এবং আপনি নিজে দেখতে পারবেন।\n- **পাসওয়ার্ড দিয়ে নম্বর পরিবর্তন**: নম্বর পরিবর্তন করতে প্রোফাইল সেটিংসে গিয়ে নতুন ১০ ডিজিটের নম্বর এবং আপনার পাসওয়ার্ড দিলে সাথে সাথে নম্বর আপডেট হয়ে যাবে!`,
    action: { text: '👤 Go to Profile Settings', action: 'open_profile' }
  },
  {
    topic: 'thank_you',
    keywords: ['thank', 'thanks', 'thank you', 'dhonnobad', 'danyabad', 'ধন্যবাদ', 'অনেক ধন্যবাদ', 'থ্যাংক ইউ', 'থ্যাঙ্কস', 'অসংখ্য ধন্যবাদ', 'ভালো লাগলো', 'দারুন', 'superb', 'awesome', 'great job'],
    english: `You are very welcome! 💖✨ It is my absolute pleasure to assist you. Enjoy preserving every beautiful memory in your Private Photo Cloud! 🌟`,
    bengali: `আপনাকে অনেক অনেক স্বাগতম ও আন্তরিক ধন্যবাদ! 💖✨ আপনাকে সাহায্য করতে পেরে আমি আনন্দিত। আপনার প্রাইভেট ক্লাউডে চমৎকার সব স্মৃতি সুরক্ষিত রাখুন! 🌟`,
    action: null
  }
];

function isBengaliText(str) {
  return /[\u0980-\u09FF]/.test(str);
}

function processAiQuestion(req, res) {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { message: 'Question prompt is required.' }
      });
    }

    const q = question.toLowerCase().trim();
    const isBengali = isBengaliText(question);

    let bestMatch = null;
    let maxScore = 0;

    for (const item of WEBSITE_KNOWLEDGE) {
      let score = 0;
      for (const kw of item.keywords) {
        if (q.includes(kw.toLowerCase())) {
          score += (kw.length > 4 ? 3 : 1);
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && maxScore > 0) {
      const responseText = isBengali ? bestMatch.bengali : bestMatch.english;
      return res.json({
        success: true,
        topic: bestMatch.topic,
        answer: responseText,
        action: bestMatch.action || null,
        language: isBengali ? 'bn' : 'en'
      });
    }

    // Default intelligent conversational fallback
    if (isBengali) {
      return res.json({
        success: true,
        topic: 'general',
        answer: `আমি এই প্রাইভেট ক্লাউড ওয়েবসাইটের **AI Assistant**! 🤖✨\n\nআপনি আমাকে যেকোনো বিষয় নিয়ে জিজ্ঞাসা করতে পারেন:\n- 📸 **ফটো আপলোড ও ক্রপিং** কীভাবে করবেন\n- 🎵 **মিউজিক ভল্ট** থেকে গান বাজানো ও ডাউনলোড\n- 👤 **পার্সোনাল প্রোফাইল হাব** ও ফলো করা\n- 💖 **লাইক ও কমেন্ট** করার নিয়ম\n- 👑 **হেড অ্যাডমিন ও সিকিউরিটি** ব্যবস্থা\n\nনিচের যেকোনো অপশনে ক্লিক করুন বা প্রশ্ন লিখে পাঠান!`,
        action: { text: '➕ Upload Photo', action: 'open_upload' },
        language: 'bn'
      });
    } else {
      return res.json({
        success: true,
        topic: 'general',
        answer: `I am your **Private Cloud AI Assistant**! 🤖✨\n\nI know everything about this platform. Feel free to ask about:\n- 📸 **Uploading & Cropping Photos**\n- 🎵 **Music Vault (14 Tracks & Downloads)**\n- 👤 **Personal Profile Hubs & Following**\n- 💖 **Likes & Comments**\n- 👑 **Head Admin & VIP Security Controls**\n\nAsk any question or click a suggestion below to get started!`,
        action: { text: '➕ Upload Photo', action: 'open_upload' },
        language: 'en'
      });
    }
  } catch (err) {
    console.error('[Chatbot Error]:', err);
    return res.status(500).json({
      success: false,
      error: { message: 'Chatbot service error.' }
    });
  }
}

module.exports = {
  processAiQuestion
};
