const express = require('express')
const User = require('../models/user')

const router = new express.Router()

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

router.get('/users/verifyemail/:id/:token', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, 'tokens.token': req.params.token })
        if (!user) {
            throw new Error('Invalid Link')
        }
        await User.updateOne({ _id: user._id, emailVerified: true })
        res.send('email verified successfuly')
    } catch (e) {
        res.status(400).send({ e: e.message })
    }
})

router.post('/users/login', async (req, res) => {
    try {
        const user = await findByCredentials(req.body.email, req.body.password)
    }
    catch (e) {
        res.status(400).send({ e: e.message })
    }
})

module.exports = router