const express = require('express')
require('dotenv').config()
require('./db/mongoose')
const userRouter = require('./routes/user')
const postRouter = require('./routes/post')

const app = express()
app.use(express.json())
app.use(userRouter)
app.use(postRouter)

module.exports = app