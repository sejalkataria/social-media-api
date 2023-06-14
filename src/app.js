const express = require('express')
require('dotenv').config()
require('./db/mongoose')
const userRouter = require('./routes/user')

const app = express()
app.use(express.json())
app.use(userRouter)

module.exports = app