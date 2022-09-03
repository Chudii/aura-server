const mongoose = require('mongoose')

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    timer: { type: Number, required: true },
    category: { type: String, required: true },
    questions: [
        { 
            question: {type: String}, 
            answer: {type: String}, 
            decoys: [String]
        }
    ]
}, { collection: 'quiz' })

const Quiz = mongoose.model('Quiz', quizSchema)

module.exports = Quiz