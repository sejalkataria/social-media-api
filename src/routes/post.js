const express = require('express')
const multer = require('multer')
const sharp = require('sharp')

const Post = require('../models/post')
const auth = require('../middleware/auth')

const router = new express.Router()

const upload = multer({
    limits: {
        fieldSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpeg|png|jpg)$/)) {
            return cb(new Error('Please upload valid image'))
        }
        cb(undefined, true)
    }
})

router.post('/users/post', auth, upload.single('post'), async (req, res) => {
    if (req.file) {
        const buffer = await sharp(req.file.buffer).resize({ width: 280, height: 280 }).png().toBuffer()
        const description = req.body.description
        const post = new Post({ img: buffer, description, userId: req.user._id })
        await post.save()
        res.status(201).send('successfully uploaded post!')
    }
    else {
        res.send('Please select image to upload')
    }

},
    (e, req, res, match) => {
        res.status(400).send({ e: e.message })
    }
)

module.exports = router