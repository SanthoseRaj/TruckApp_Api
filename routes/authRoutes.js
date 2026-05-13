const express = require('express');
const { login, profile, getEntryTeams, createAdmin, createMember } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with username and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: owner
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/entry-teams:
 *   get:
 *     summary: List entry teams available for member assignment
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entry team list
 *       401:
 *         description: Unauthorized
 */
router.get('/entry-teams', protect, allowRoles('owner', 'admin'), getEntryTeams);

/**
 * @swagger
 * /api/auth/admins:
 *   post:
 *     summary: Create an admin user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminInput'
 *     responses:
 *       201:
 *         description: Admin created
 *       400:
 *         description: Missing or invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Username already exists
 */
router.post('/admins', protect, allowRoles('owner'), createAdmin);

/**
 * @swagger
 * /api/auth/members:
 *   post:
 *     summary: Create an entry team member user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMemberInput'
 *     responses:
 *       201:
 *         description: Member created
 *       400:
 *         description: Missing or invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Username already exists
 */
router.post('/members', protect, allowRoles('owner', 'admin'), createMember);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', protect, profile);

module.exports = router;
