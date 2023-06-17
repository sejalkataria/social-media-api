const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const jwt = require('jsonwebtoken')

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

//forget password
router.post('/users/forgetPassword', async (req, res) => {
    const email = req.body.email
    try {
        const user = await User.findByEmail(email)
        res.status(200).send(user)
    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

//reset password
router.post('/users/:id/:resetPasswordToken', async (req, res) => {
    try {
        const decode = jwt.verify(req.params.resetPasswordToken, process.env.RESET_PASSWORD)
        const user = await User.findOne({ _id: decode._id, 'resetPasswordToken.token': req.params.resetPasswordToken })
        if (!user) {
            throw new Error()
        }
        user.password = req.body.password
        user.resetPasswordToken = user.resetPasswordToken.filter((token) => {
            return token.token !== req.params.resetPasswordToken
        })
        await user.save()
        res.status(200).send('password changed successfully!')
    } catch (e) {
        res.status(401).send({ e: e.message })
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

//see profiePicture
router.get('/users/:id/profilePicture', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user || !user.profilePicture) {
            throw new Error('user or profile picture not found!')
        }
        res.set('Content-Type', 'image/png')
        res.send(user.profilePicture)

    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

//delete user's profile picture
router.delete('/users/me/profilePicture', auth, async (req, res) => {
    try {
        req.user.profilePicture = undefined
        await req.user.save()
        res.send('profile picture deletd successfully!')
    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

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

//unfollow user
router.put('/users/:id/unfollow', auth, async (req, res) => {
    if (req.user._id !== req.params.id) {
        try {
            const currentUser = req.user
            const unfollowUser = await User.findOne({ _id: req.params.id })
            if (unfollowUser.followers.includes(currentUser._id)) {
                await unfollowUser.updateOne({ $pull: { followers: currentUser._id } })
                await currentUser.updateOne({ $pull: { following: unfollowUser._id } })
                res.status(200).send(`you unfollowed ${unfollowUser.userName}`)
            }
            else {
                res.status(400).send(`you are not following ${unfollowUser.userName}`)
            }
        } catch (e) {
            res.status(500).send({ e: e.message })
        }
    }
    else {
        res.status(403).send('you can not unfollow yourself')
    }

})

module.exports = router