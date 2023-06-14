const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                return 'Please enter valid email!'
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        min: 6
    },
    profilePicture: {
        type: Buffer
    },
    followers: {
        type: Array,
        default: []
    },
    following: {
        type: Buffer,
        default: []
    },
    bio: {
        type: String,
        max: 50
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    tokens: [{
        token: {
            type: String
        }
    }]
}, {
    timestamps: true
})

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET)
    user.tokens = user.tokens.concat({ token })
    await user.save()
    return token
}

userSchema.pre('save', async function (next) {
    const user = this
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }
    next()
})

const User = mongoose.model('User', userSchema, 'User')
module.exports = User