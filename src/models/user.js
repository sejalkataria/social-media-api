const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const Post = require('./post')

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
        type: Array,
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
    }],
    resetPasswordToken: [{
        token: {
            type: String
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

userSchema.virtual("posts", {
    ref: 'Post',
    localField: '_id',
    foreignField: 'userId'
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()
    delete userObject.password
    delete userObject.tokens
    delete userObject.profilePicture
    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET)
    user.tokens = user.tokens.concat({ token })
    await user.save()
    return token
}

userSchema.statics.findByCredentials = async function (email, password) {
    const user = await User.findOne({ email: email, emailVerified: true })
    if (!user) {
        throw new Error('user not found. Please check your email/verify your email!')
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        throw new Error('Password does not match!')
    }
    return user
}

userSchema.statics.findByEmail = async function (email) {
    const user = await User.findOne({ email, emailVerified: true })
    if (!user) {
        throw new Error('email not found!')
    }
    const resetPassword = jwt.sign({ _id: user._id.toString() }, process.env.RESET_PASSWORD, { expiresIn: '20m' })
    user.resetPasswordToken = user.resetPasswordToken.concat({ token: resetPassword })
    await user.save()
    return user
}

userSchema.pre('save', async function (next) {
    const user = this
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }
    next()
})

userSchema.pre('deleteOne', async function (next) {
    const user = this
    await Post.deleteMany({ userId: user._conditions._id })
    next()
})

const User = mongoose.model('User', userSchema, 'User')
module.exports = User