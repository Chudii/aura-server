const mongoose = require('mongoose')

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    questions: [
        { 
            question: {type: String}, 
            answers: {
                a: String,
                b: String,
                c: String,
                d: String
            }, 
            correct: {type: String}
        }
    ]
}, { collection: 'quiz' })

const Quiz = mongoose.model('Quiz', quizSchema)

module.exports = Quiz