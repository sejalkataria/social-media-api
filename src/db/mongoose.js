const mongoose = require('mongoose')

const connection = async () => {
    const connect = await mongoose.connect(process.env.MONGODB_URL)
    return connect
}

connection().then(() => console.log('Connected Successfully to MongoDB!'))
    .catch((e) => console.log('Failed to connect to MongoDB!'))