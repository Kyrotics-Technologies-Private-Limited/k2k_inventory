/*const express = require("express");
const router = express.Router();
const { registerUser,loginUser } = require("../controllers/userController");

const verifyFirebaseToken = require("../middleware/firebaseAuth");

router.post("/register", registerUser);
router.post("/login",loginUser)

module.exports = router;*/

/*const express = require("express");
const router = express.Router();
const userController = require('../controllers/authController');

// Register a new user
router.post("/register", userController.registerUser);

// Get user profile using UID
router.get('/:userId', userController.getUserProfile);

// Save or update user profile using UID
router.post('/:userId', userController.saveUserProfile);

// Update profile picture using UID
router.put('/:userId/picture', userController.updateProfilePicture);

module.exports = router;*/

const express = require("express");
const router = express.Router();
const userController = require("../controllers/authController");

const auth = require("../middleware/firebaseAuth");

router.post('/user', auth, userController.createOrUpdateUser);
router.get('/getUser', auth, userController.getUser);
router.get('/check', auth, userController.checkUserExists);
router.delete('/delete', auth, userController.deleteUser);

module.exports = router;


