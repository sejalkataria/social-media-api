const express = require('express')
const multer = require('multer')
const sharp = require('sharp')

const User = require('../models/user')
const auth = require('../middleware/auth')

const router = new express.Router()

const upload = multer({
    limits: {
        fieldSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|png|jpej)$/)) {
            return cb(new Error('Please upload valid image'))
        }
        cb(undefined, true)
    }
})

//register user
router.post('/users/registration', async (req, res) => {
    const user = new User(req.body)
    try {
        await user.save()
        const token = await user.generateAuthToken()
        // const verifyEmail = `/users/verifyemail/${user._id}/${token}`
        res.status(201).send("Please verify your email")
    } catch (e) {
        res.status(400).send({ e: e.message })
    }
})

//verify user
router.get('/users/verifyemail/:id/:token', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, 'tokens.token': req.params.token })
        if (!user) {
            throw new Error('Invalid Link')
        }
        await user.updateOne({ _id: user._id, emailVerified: true })
        res.send('email verified successfuly')
    } catch (e) {
        res.status(400).send({ e: e.message })
    }
})

//login user
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.status(200).send({ user, token })
    }
    catch (e) {
        res.status(400).send({ e: e.message })
    }
})

//logout user
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }

})

//logout user from all device
router.post('/users/logoutAll', auth, async (req, res) => {
    req.user.tokens = []
    await req.user.save()
    res.send('Logged out from all devices')
})

//update user
router.post('/users/me/update', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ["userName", "email", "password", "bio"]
    const validOperation = updates.every((update) => allowedUpdates.includes(update))
    if (!validOperation) {
        throw new Error('This Update is NOT ALLOWED!')
    }
    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.status(200).send('user updated successfully!')
    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

//see user profile
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

//delete user
router.delete('/users/me', auth, async (req, res) => {
    try {
        const user = await User.deleteOne({ _id: req.user._id })
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e.message)
    }
})

//upload profile picture
router.post('/users/me/profilePicture', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.profilePicture = buffer
    await req.user.save()
    res.send('profile picture uploaded successfully!')
},
    (e, req, res, match) => {
        res.status(400).send({ e: e.message })
    }
)

//follow a user
router.put('/users/:id/follow', auth, async (req, res) => {
    if (req.user._id !== req.params._id) {
        try {
            const currentUser = req.user
            const followUser = await User.findById(req.params.id)
            if (!followUser.followers.includes(currentUser._id)) {
                await followUser.updateOne({ $push: { followers: currentUser._id } })
                await currentUser.updateOne({ $push: { following: followUser._id } })
                res.status(200).send(`you started following ${followUser.userName}`)
            }
            else {
                res.status(403).send(`You already follow user ${followUser.userName}`)
            }
        } catch (e) {
            res.status(500).send({ e: e.message })
        }
    }
    else {
        res.status(403).send('you can not follow yourself')
    }
})

module.exports = router