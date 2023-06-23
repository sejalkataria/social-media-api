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

//upload a post
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

//edit a post
router.patch('/posts/:id/update', auth, async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user._id })
        post.description = req.body.description
        await post.save()
        res.status(200).send(`description was updated to ${post.description}`)
    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

//delete a post
router.delete('/posts/:id', auth, async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user._id })
        if (!post) {
            throw new Error('post not found!')
        }
        await Post.deleteOne(post)
        res.status(200).send('post deleted successfully!')
    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

//see all post uploaded by signed in user
router.get('/users/me/posts', auth, async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.user._id })
        if (!posts) {
            throw new Error('No posts found, upload post!')
        }
        res.send(posts)
    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

//see all posts of a user whom you follow
router.get('/users/:id/posts', auth, async (req, res) => {
    if (req.user.following.includes(req.params.id)) {
        try {
            const posts = await Post.find({ userId: req.params.id })
            res.send(posts)
        } catch (e) {
            res.status(500).send({ e: e.message })
        }
    }
    else {
        res.send(`you do not follow ${req.params.id}`)
    }
})

//like/dislike user's post whom you follow
router.put('/posts/:id/like', auth, async (req, res) => {
    try {
        const currentUser = req.user
        const post = await Post.findOne({ _id: req.params.id })
        if (currentUser.following.includes(post.userId)) {
            console.log('yes you follow this user')
            if (!post.likes.includes(currentUser._id)) {
                await post.updateOne({ $push: { likes: currentUser._id } })
                res.status(200).send('The post has been liked')
            }
            else {
                await post.updateOne({ $pull: { likes: currentUser._id } })
                res.status(200).send('The post has been disliked')
            }
        }
        else {
            console.log(`you do not follow this user, follow one to like posts`)
        }
    } catch (e) {
        res.status(500).send({ e: e.message })
    }

})

//get timeline posts
router.get('/posts/timeline/all', auth, async (req, res) => {
    try {
        const currentUser = req.user
        const usersPost = await Post.find({ userId: currentUser._id })
        const friendPosts = await Promise.all(
            currentUser.following.map((friendId) => {
                return Post.find({ userId: friendId })
            })
        )
        res.json(usersPost.concat(...friendPosts))

    } catch (e) {
        res.status(500).send(e)
    }
})

//comment on user's post
router.post('/posts/:id/comment', auth, async (req, res) => {
    try {
        const currentUser = req.user
        const post = await Post.findOne({ _id: req.params.id })
        if (currentUser.following.includes(post.userId)) {
            await Post.updateOne({ $push: { comments: { comment: req.body.comment, postedBy: req.user._id } } })
            res.status(200).send('you commented on this post!')
        }
        else {
            res.status(400).send('Please follow the user to comment on their posts!')
        }
    } catch (e) {
        res.status(500).send({ e: e.message })
    }
})

module.exports = router