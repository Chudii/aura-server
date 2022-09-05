const quizController = require('../controllers/quizController')
const express = require('express')
const router = express.Router()

router.get('/', quizController.allQuizzes)

router.post('/', quizController.createQuiz)

router.get('/:quizId', quizController.readQuiz)

router.put('/:quizId', quizController.updateQuiz)

router.delete('/:quizId', quizController.deleteQuiz)

module.exports = router