const mongoose = require('mongoose')

const playerSchema = new mongoose.Schema({
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    hostId: { type: String },
    pin: { type: Number },
    playerId: { type: String },
    nickname: { type: String },
    answer: { type: String },
    score: { type: Number },
    streak: { type: Number },
    rank: { type: Number },
    lastCorrect: { type: Boolean },
    totalCorrect: { type: Number }
}, { collection: 'player' })

const Player = mongoose.model('Player', playerSchema)

module.exports = Player