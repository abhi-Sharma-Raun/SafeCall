import mongoose from 'mongoose'

export function isMongoReady() {
  return mongoose.connection.readyState === 1
}

export async function connectMongo(uri) {
  if (!uri) {
    return false
  }

  if (isMongoReady()) {
    return true
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  })

  return true
}