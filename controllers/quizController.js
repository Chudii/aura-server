const Quiz = require('../models/quizModel')

exports.allQuizzes = (req, res) => {
    Quiz.find({}, (err, quizzes) => {
        if (err) res.send(err)
        res.json(quizzes)
    })
}

exports.createQuiz = (req, res) => {
    const newQuiz = new Quiz(req.body)

    newQuiz.save((err, quiz) => {
        if (err) res.send(err)
        res.json(quiz)
    })
}

exports.readQuiz = (req, res) => {
    Quiz.findById(req.params.quizId, (err, quiz) => {
        if (err) res.send(err)
        res.json(quiz)
    })
}

exports.updateQuiz = (req, res) => {
    Quiz.findOneAndUpdate(
        { _id: req.params.quizId },
        req.body,
        { new: true },
        (err, quiz) => {
            if (err) res.send(err)
            res.json(quiz)
        }
    )
}

exports.deleteQuiz = (req, res) => {
    Quiz.deleteOne(
        { _id: req.params.quizId },
        err => {
            if (err) res.send(err)
            res.json({
                message: 'Quiz Deleted',
                _id: req.params.quizId
            })
        }
    )
}