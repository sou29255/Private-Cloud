const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const dbStore = require('../services/dbStore');

const musicDir = path.join(__dirname, '../../music');

// Ensure music directory exists
if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true });
}

// Default Seed Track Meta
const defaultSeedDetails = [
  { title: 'Tum Hi Ho', genre: 'Romantic Song', emoji: '❤️', desc: 'Heartfelt Love Melody' },
  { title: 'Channa Mereya', genre: 'Sad Song', emoji: '🌧️', desc: 'Emotional Soulful Track' },
  { title: 'Kesariya', genre: 'Romantic Song', emoji: '💖', desc: 'Sweet Romantic Rhythm' },
  { title: 'Khairiyat', genre: 'Sad Song', emoji: '💔', desc: 'Touching Melancholy' },
  { title: 'Raataan Lambiyan', genre: 'Romantic Song', emoji: '✨', desc: 'Soft Acoustic Romance' },
  { title: 'Hawayein', genre: 'Enjoyful Song', emoji: '🍃', desc: 'Pleasant & Joyful Breeze' },
  { title: 'Kal Ho Naa Ho', genre: 'Sad Song', emoji: '🥀', desc: 'Deep Emotional Classic' },
  { title: 'Apna Bana Le', genre: 'Romantic Song', emoji: '🌹', desc: 'Pure Romantic Passion' },
  { title: 'Tujhe Kitna Chahne Lage', genre: 'Sad Song', emoji: '🌧️', desc: 'Heartbreak & Tears' },
  { title: 'Ghungroo', genre: 'Enjoyful Song', emoji: '🎉', desc: 'Upbeat Dance Party' },
  { title: 'Agar Tum Saath Ho', genre: 'Sad Song', emoji: '🌙', desc: 'Late Night Sad Thoughts' },
  { title: 'Shayad', genre: 'Romantic Song', emoji: '💫', desc: 'Gentle Love Harmonies' },
  { title: 'Subhanallah', genre: 'Enjoyful Song', emoji: '☀️', desc: 'Bright & Cheerful Celebration' },
  { title: 'Pasoori', genre: 'Enjoyful Song', emoji: '⚡', desc: 'Energetic Fusion Beat' }
];

let cachedMusicFiles = [];

async function getOrLoadMusicFiles() {
  const audioExtensions = ['.mp3', '.mpeg', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  const files = await fsp.readdir(musicDir);
  cachedMusicFiles = files
    .filter(f => audioExtensions.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  return cachedMusicFiles;
}

const getMusicList = async (req, res) => {
  try {
    const files = await getOrLoadMusicFiles();
    const communityTracks = dbStore.getCommunityTracks();

    // 1. Map community uploaded tracks
    const mappedCommunityTracks = communityTracks.map((ct) => ({
      id: ct.id,
      title: ct.title,
      artist: ct.artist || 'Community Artist',
      genre: ct.genre || 'Melodic Song',
      emoji: ct.emoji || '🎵',
      description: (ct.description || `${ct.genre || 'Melodic Song'} by ${ct.artist || 'Artist'}`).replace(/@\S+/g, '').trim(),
      addedBy: ct.addedBy || { username: 'Community', displayName: 'Community', avatar: '🎵' },
      isCommunity: true,
      filename: ct.filename,
      url: `/api/music/stream-custom/${ct.id}`,
      downloadUrl: `/api/music/download-custom/${ct.id}?name=${encodeURIComponent(ct.title)}`,
      createdAt: ct.createdAt
    }));

    // 2. Map seed tracks (filter out community tracks so no duplicate files)
    const communityFilenames = new Set(communityTracks.map(ct => ct.filename));
    const seedFiles = files.filter(f => !communityFilenames.has(f));

    const mappedSeedTracks = seedFiles.map((filename, index) => {
      const detail = defaultSeedDetails[index % defaultSeedDetails.length];
      return {
        id: `track_seed_${index + 1}`,
        trackNumber: index + 1,
        title: detail.title,
        artist: 'Bollywood Vault',
        genre: detail.genre,
        emoji: detail.emoji,
        description: detail.desc,
        addedBy: { username: 'System', displayName: 'Music Vault 🎵', avatar: '🎶' },
        isCommunity: false,
        filename: filename,
        url: `/api/music/stream/${index}`,
        downloadUrl: `/api/music/download/${index}?name=${encodeURIComponent(detail.title)}`
      };
    });

    // Community tracks at the top, followed by seed tracks
    const allTracks = [...mappedCommunityTracks, ...mappedSeedTracks];

    return res.json({
      success: true,
      total: allTracks.length,
      tracks: allTracks
    });
  } catch (err) {
    console.error('[Music] Failed to load music list:', err);
    return res.json({
      success: true,
      total: 0,
      tracks: []
    });
  }
};

// Intelligent Audio Analyzer & Arranger Helper
function analyzeAudioInfo(filename, userTitle, userArtist, userGenre, userEmoji) {
  let rawName = (userTitle || path.parse(filename).name || 'Track').trim();
  
  // Clean prefixes and suffixes like 'yt1s.com - ', '320kbps', '[Official Audio]', 'WhatsApp Audio ...'
  rawName = rawName
    .replace(/^WhatsApp Audio \d{4}-\d{2}-\d{2} at [\d.]+ [AP]M/i, 'Voice Memory')
    .replace(/^(yt1s\.com|pagalworld|mr-jatt|djmaza|spotifydown|y2mate)[\s\-_]+/i, '')
    .replace(/\[?(?:320kbps|128kbps|official video|official audio|lyrics|full song|hq|remastered)\]?/gi, '')
    .replace(/\(?(?:official video|official audio|lyrics|full song|hq|remastered|video)\)?/gi, '')
    .replace(/[_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let detectedArtist = userArtist ? userArtist.trim() : '';
  let detectedTitle = rawName;

  // If contains " - " or " by ", split artist and title
  if (!detectedArtist && detectedTitle.includes(' - ')) {
    const parts = detectedTitle.split(' - ');
    if (parts.length >= 2) {
      detectedArtist = parts[0].trim();
      detectedTitle = parts.slice(1).join(' - ').trim();
    }
  }

  // Capitalize nicely
  detectedTitle = detectedTitle.charAt(0).toUpperCase() + detectedTitle.slice(1);
  if (!detectedArtist) detectedArtist = 'Original Recording';

  // Keyword-based Genre & Mood Analysis
  const combinedText = `${detectedTitle} ${detectedArtist} ${rawName}`.toLowerCase();
  let genre = userGenre || 'Romantic Song';
  let emoji = userEmoji || '💖';

  if (!userGenre || userGenre === 'auto') {
    if (/(sad|kanna|dukkho|channa|khairiyat|tears|alone|breakup|judai|dard|heartbreak|dholna)/i.test(combinedText)) {
      genre = 'Sad Song';
      emoji = '🌧️';
    } else if (/(party|dance|ghungroo|dhamaka|nacho|beats|dj|enjoyful|pasoori|bhangra|dhol|masti)/i.test(combinedText)) {
      genre = 'Enjoyful Song';
      emoji = '🎉';
    } else if (/(devotional|bhajan|saraswati|rabindra|geet|om|shiva|krishna|prayer|divine|puja|aarti)/i.test(combinedText)) {
      genre = 'Devotional Song';
      emoji = '🕊️';
    } else if (/(lofi|lo-fi|chill|sleep|night|rain|acoustic|guitar|relax|peace|breeze)/i.test(combinedText)) {
      genre = 'Lo-Fi & Chill';
      emoji = '🎧';
    } else if (/(rock|pop|energetic|fast|rap|hiphop|bass)/i.test(combinedText)) {
      genre = 'Rock & Pop';
      emoji = '⚡';
    } else {
      genre = 'Romantic Song';
      emoji = '💖';
    }
  }

  return {
    title: detectedTitle,
    artist: detectedArtist,
    genre,
    emoji
  };
}

const uploadMusicTrack = async (req, res) => {
  try {
    let filename = '';
    const { title, artist, genre: rawGenre, emoji: rawEmoji, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Please select an audio file (MP3, WAV, M4A, AAC, OGG, FLAC).' });
    }

    // Run AI Audio Analyzer to standardize Title, Artist, Genre and Mood
    const analysis = analyzeAudioInfo(req.file.originalname, title, artist, rawGenre, rawEmoji);

    // Save buffer to file in musicDir
    const cleanExt = path.extname(req.file.originalname) || '.mp3';
    const cleanName = analysis.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 30);
    filename = `comm_${Date.now()}_${cleanName}${cleanExt}`;
    const destPath = path.join(musicDir, filename);
    await fsp.writeFile(destPath, req.file.buffer);

    // Resolve Uploader Details
    let uploader = {
      username: 'Community',
      displayName: 'Community Member',
      avatar: '🎵'
    };

    if (req.user) {
      const dbUser = dbStore.getUser(req.user.username);
      uploader = {
        id: req.user.id || dbUser?.id,
        username: req.user.username || dbUser?.username || 'Member',
        displayName: dbUser?.displayName || req.user.displayName || req.user.username,
        avatar: dbUser?.customAvatarUrl || dbUser?.avatar || req.user.avatar || '👤'
      };
    }

    const newTrack = {
      id: `comm_track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: analysis.title,
      artist: analysis.artist,
      genre: analysis.genre,
      emoji: analysis.emoji,
      description: (description || `${analysis.genre} by ${analysis.artist}`).replace(/@\S+/g, '').trim(),
      filename: filename,
      addedBy: uploader,
      createdAt: new Date().toISOString()
    };

    dbStore.addCommunityTrack(newTrack);

    return res.json({
      success: true,
      message: `"${newTrack.title}" (${newTrack.genre}) analyzed & arranged into Music Vault successfully! 🎵`,
      track: newTrack
    });
  } catch (err) {
    console.error('[Music Upload Error]:', err);
    return res.status(500).json({ error: 'Failed to upload music track: ' + err.message });
  }
};

const deleteMusicTrack = async (req, res) => {
  try {
    const trackId = req.params.id;
    const username = req.user?.username?.toLowerCase();
    const isSoumya = req.user && (username === 'soumya' || req.user.role === 'HEAD_ADMIN');

    // Strict Authorization: Only Soumya (Head Admin) has permission to delete tracks
    if (!isSoumya) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only Soumya (Head Admin) has the authority to delete tracks from the Music Vault.'
        }
      });
    }

    const communityTracks = dbStore.getCommunityTracks();
    const trackToDelete = communityTracks.find(t => t.id === trackId);

    if (trackToDelete) {
      dbStore.deleteCommunityTrack(trackId);
      
      if (trackToDelete.filename) {
        const filePath = path.join(musicDir, trackToDelete.filename);
        if (fs.existsSync(filePath)) {
          await fsp.unlink(filePath).catch(() => {});
        }
      }

      return res.json({
        success: true,
        message: `Track "${trackToDelete.title}" was permanently removed by Soumya! 🗑️`
      });
    }

    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Track not found in Music Vault.' }
    });
  } catch (err) {
    console.error('[Delete Music Error]:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete track: ' + err.message }
    });
  }
};

const streamAudio = async (req, res) => {
  try {
    const files = await getOrLoadMusicFiles();
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= files.length) {
      return res.status(404).json({ error: 'Track not found' });
    }
    const filename = files[index];
    const filePath = path.join(musicDir, filename);

    if (!fs.existsSync(filePath)) {
      console.error('[Music Stream] File not found:', filePath);
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'audio/mpeg';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.m4a' || ext === '.aac') mimeType = 'audio/aac';
    else if (ext === '.flac') mimeType = 'audio/flac';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600'
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[Music Stream] Error:', err);
    return res.status(500).json({ error: 'Failed to stream audio' });
  }
};

const streamCustomAudio = async (req, res) => {
  try {
    const trackId = req.params.id;
    const communityTracks = dbStore.getCommunityTracks();
    const track = communityTracks.find(t => t.id === trackId);

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const filePath = path.join(musicDir, track.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found on disk' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(track.filename).toLowerCase();
    let mimeType = 'audio/mpeg';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.m4a' || ext === '.aac') mimeType = 'audio/aac';
    else if (ext === '.flac') mimeType = 'audio/flac';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600'
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[Stream Custom Audio Error]:', err);
    return res.status(500).json({ error: 'Failed to stream audio' });
  }
};

const downloadAudio = async (req, res) => {
  try {
    const files = await getOrLoadMusicFiles();
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= files.length) {
      return res.status(404).json({ error: 'Track not found' });
    }
    const filename = files[index];
    const customName = req.query.name || path.parse(filename).name || 'track';
    const cleanDownloadName = `${customName}.mp3`;
    const filePath = path.join(musicDir, filename);

    if (!fs.existsSync(filePath)) {
      console.error('[Music Download] File not found:', filePath);
      return res.status(404).json({ error: 'Audio file not found' });
    }

    res.download(filePath, cleanDownloadName);
  } catch (err) {
    console.error('[Music Download] Error:', err);
    return res.status(500).json({ error: 'Failed to download audio' });
  }
};

const downloadCustomAudio = async (req, res) => {
  try {
    const trackId = req.params.id;
    const communityTracks = dbStore.getCommunityTracks();
    const track = communityTracks.find(t => t.id === trackId);

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const filePath = path.join(musicDir, track.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const ext = path.extname(track.filename) || '.mp3';
    const downloadName = `${track.title.replace(/[^a-zA-Z0-9_\-\s]/g, '_')}${ext}`;
    res.download(filePath, downloadName);
  } catch (err) {
    console.error('[Download Custom Audio Error]:', err);
    return res.status(500).json({ error: 'Failed to download audio' });
  }
};

module.exports = {
  getMusicList,
  uploadMusicTrack,
  deleteMusicTrack,
  streamAudio,
  streamCustomAudio,
  downloadAudio,
  downloadCustomAudio
};
