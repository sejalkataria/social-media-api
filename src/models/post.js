const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
    img: {
        type: Buffer
    },
    description: {
        type: String,
        max: 50
    },
    likes: {
        type: Array,
        default: []
    },
    userId: {
        id: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
})

const Post = mongoose.model('Post', postSchema, 'Post')
module.exports = Post