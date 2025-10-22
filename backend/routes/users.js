const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserCollection = require("../models/UserCollection");

router.get("/search", async (req, res) => {
  try {
    const { name } = req.query;
    const users = await User.find({ name: { $regex: name, $options: "i" } });

    const usersWithCollections = await Promise.all(
      users.map(async (u) => {
        const userCollection = await UserCollection.findOne({ userId: u._id });
        return {
          _id: u._id,
          name: u.name,
          profilePicture: u.profilePicture,
          collection: userCollection?.collection || [],
          favorites: userCollection?.favorites || [],
        };
      })
    );

    res.json(usersWithCollections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
});

module.exports = router;
