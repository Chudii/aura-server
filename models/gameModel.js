const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema({
    hostId: { type: String },
    pin: { type: Number },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz'},
    gameStatus: { type: Boolean },
    playersAnswered: { type: Number },
    questionNumber: { type: Number },
    questionStatus: { type: Boolean }
}, { collection: 'game' })

const Game = mongoose.model('Game', gameSchema)

module.exports = Game