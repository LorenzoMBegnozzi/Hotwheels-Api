const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// Send friend request (adds requester id to target.friendRequests)
router.post('/request', auth, async (req, res) => {
  try {
    const fromUser = req.user.id;
    const { toUserId } = req.body;
    if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) return res.status(400).json({ message: 'Invalid toUserId' });
    if (String(fromUser) === String(toUserId)) return res.status(400).json({ message: 'Cannot friend yourself' });

    const target = await User.findById(toUserId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    // if already friends
    if (target.friends && target.friends.some((f) => String(f) === String(fromUser))) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // if request already exists
    if (target.friendRequests && target.friendRequests.some((r) => String(r) === String(fromUser))) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    target.friendRequests = target.friendRequests || [];
    target.friendRequests.push(fromUser);
    await target.save();

    res.status(200).json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Error sending friend request', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request (accept incoming request from fromUserId)
router.post('/accept', auth, async (req, res) => {
  try {
    const toUser = req.user.id; // current user accepting
    const { fromUserId } = req.body;
    if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId)) return res.status(400).json({ message: 'Invalid fromUserId' });

    const me = await User.findById(toUser);
    const other = await User.findById(fromUserId);
    if (!me || !other) return res.status(404).json({ message: 'User not found' });

    // remove request
    me.friendRequests = (me.friendRequests || []).filter((r) => String(r) !== String(fromUserId));
    // add to friends both sides if not present
    me.friends = me.friends || [];
    other.friends = other.friends || [];
    if (!me.friends.some((f) => String(f) === String(fromUserId))) me.friends.push(fromUserId);
    if (!other.friends.some((f) => String(f) === String(toUser))) other.friends.push(toUser);

    await me.save();
    await other.save();

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Error accepting friend request', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline friend request
router.post('/decline', auth, async (req, res) => {
  try {
    const toUser = req.user.id;
    const { fromUserId } = req.body;
    if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId)) return res.status(400).json({ message: 'Invalid fromUserId' });

    const me = await User.findById(toUser);
    if (!me) return res.status(404).json({ message: 'User not found' });

    me.friendRequests = (me.friendRequests || []).filter((r) => String(r) !== String(fromUserId));
    await me.save();

    res.status(200).json({ message: 'Friend request declined' });
  } catch (err) {
    console.error('Error declining friend request', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
