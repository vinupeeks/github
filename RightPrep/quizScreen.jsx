import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { getQuizQuestionsForAttempt } from '../../Sync/queries/QuizQuestionsQueries';
import { useDispatch, useSelector } from 'react-redux';
import { completeQuizAttempt, createQuizAttemptInProgress, getQuizAttempts } from '../../Sync/queries/QuizAttemptQueries';
import { getPriorityTrainings } from '../../Sync/queries/PriorityTrainingQueries';
import { useApi } from '../../context/ApiProvider';
import { setSnackbar } from '../../redux/reducers/snackbarReducers';

const QuizQuestionScreen = ({ navigation, route }) => {

    const { setApiDataAndNotify } = useApi()
    const dispatch = useDispatch();

    const quizSettings = useSelector(state => state.quizSettings.settings);
    const quizAttempt = useSelector(state => state.quizAttempt);
    const user = useSelector(state => state.auth.user);

    const userId = user?.id;
    const vesselId = user?.vessel_id;
    const rankId = user?.rank_id;

    const [attemptId, setAttemptId] = useState(null);
    const { currentQuestion: initialQuestion = 0 } = route.params || {};

    // const [questions, setQuestions] = useState([]);
    // const [answers, setAnswers] = useState({});
    // const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);

    const questions = quizAttempt.questions;
    const answers = quizAttempt.answers;
    const currentQuestion = quizAttempt.currentQuestion;

    const [timeRemaining, setTimeRemaining] = useState(quizSettings?.duration_minutes * 60);

    const questionsRef = useRef([]);
    const answersRef = useRef({});
    const attemptIdRef = useRef(null);

    // Keep refs in sync with state
    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);

    useEffect(() => {
        const initQuiz = async () => {
            try {
                const allAttempts = await getQuizAttempts();

                const lastInProgress = allAttempts
                    ?.filter(a => a.status === 'INPROGRESS' && (a.primary_id === null || a.primary_id === undefined))
                    ?.sort((a, b) => b.id - a.id)[0];

                if (lastInProgress) {

                    setAttemptId(lastInProgress.id);

                    const result = await getQuizQuestionsForAttempt({ quizSettings });

                    setQuestions(result?.questions || []);
                    return;
                }
                console.log(`new`);


                const priorityTraining = await getPriorityTrainings();

                if (!priorityTraining || priorityTraining.length === 0) {
                    Alert.alert("Error", "No active training found");
                    navigation.goBack();
                    return;
                }

                const newAttemptId = await createQuizAttemptInProgress({
                    user_id: userId,
                    vessel_id: vesselId,
                    rank_id: rankId,
                    priority_training_id: priorityTraining[0].primary_id,
                    total_questions: quizSettings?.no_of_questions
                });

                setAttemptId(newAttemptId);

                const result = await getQuizQuestionsForAttempt({ quizSettings });
                setApiDataAndNotify(new Date())
                setQuestions(result?.questions || []);

            } catch (err) {
                console.error("Quiz init error:", err);
            }
        };

        initQuiz();
    }, []);

    const question = questions[currentQuestion];
    const totalQuestions = questions?.length || 0;
    const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
    const answeredCount = Object.keys(answers).length;

    const handleAutoFinish = async () => {
        const currentQuestions = questionsRef?.current;
        const currentAnswers = answersRef?.current;
        const currentAttemptId = attemptIdRef?.current;

        if (!currentAttemptId || currentQuestions?.length === 0) return;

        try {
            const score = calculateScore(currentQuestions, currentAnswers);
            const total = currentQuestions?.length;
            const percentage = (score / total) * 100;
            const status = percentage >= quizSettings?.pass_percentage ? 'COMPLETED' : 'FAILED';

            const answersArray = currentQuestions?.map((q, index) => {
                const userAnswer = currentAnswers[index];

                return {
                    quiz_question_id: q.id,

                    selected_option:
                        q?.question_type === "MCQ"
                            ? optionIndexToLetter(userAnswer)
                            : null,

                    selected_options:
                        q?.question_type === "MAQ"
                            ? (userAnswer || []).map(optionIndexToLetter)
                            : null,

                    selected_boolean:
                        q?.question_type === "BOOLEAN"
                            ? (userAnswer ? 1 : 0)
                            : null,

                    is_correct: isAnswerCorrect(q, userAnswer) ? 1 : 0,
                };
            });

            await completeQuizAttempt({
                attemptId: currentAttemptId,
                score,
                totalQuestions: total,
                status,
                answersArray,
            });

            setQuestions([]);
            setAnswers({});
            setAttemptId(null);
            setApiDataAndNotify(new Date())

            navigation.goBack();
        } catch (e) {
            console.error("Auto-submit error:", e);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAutoFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (timeRemaining === 60) {
            dispatch(
                setSnackbar({
                    open: true,
                    message: '⚠️ Hurry! You have only 60 seconds left to complete the quiz.',
                    color: '#F59E0B',
                })
            );
        }
    }, [timeRemaining]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (answer) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: answer
        }));
    };

    const handleNext = () => {
        if (currentQuestion < totalQuestions - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            handleFinishQuiz();
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const calculateScore = (questions, answers) => {
        let correct = 0;

        questions.forEach((q, index) => {
            const userAnswer = answers[index];

            if (q.question_type === "BOOLEAN") {
                const selected = userAnswer ? 1 : 0;
                if (selected === q.correct_boolean) correct++;
            }

            if (q.question_type === "MCQ") {
                const selected = optionIndexToLetter(userAnswer);
                if (selected === q.correct_option) correct++;
            }

            if (q.question_type === "MAQ") {
                const selected = (userAnswer || []).map(optionIndexToLetter);
                const correctOptions = q.correct_options || [];

                if (
                    selected.length === correctOptions.length &&
                    correctOptions.every(o => selected.includes(o))
                ) {
                    correct++;
                }
            }
        });

        return correct;
    };


    const optionIndexToLetter = (index) => {
        if (index === 0) return 'A';
        if (index === 1) return 'B';
        if (index === 2) return 'C';
        if (index === 3) return 'D';
        return null;
    };

    const isAnswerCorrect = (question, userAnswer) => {

        if (question.question_type === "BOOLEAN") {
            const selected = userAnswer ? 1 : 0;
            return selected === question.correct_boolean;
        }

        if (question.question_type === "MCQ") {
            const selected = optionIndexToLetter(userAnswer);
            return selected === question.correct_option;
        }

        if (question.question_type === "MAQ") {
            const selected = (userAnswer || []).map(optionIndexToLetter);
            const correctOptions = question.correct_options || [];

            return (
                selected.length === correctOptions.length &&
                correctOptions.every(opt => selected.includes(opt))
            );
        }

        return false;
    };

    const handleFinishQuiz = async () => {
        try {
            const score = calculateScore(questions, answers);

            const totalQuestions = questions?.length;
            const percentage = (score / totalQuestions) * 100;
            const status = percentage >= quizSettings.pass_percentage ? 'COMPLETED' : 'FAILED';
            const snackbarConfig =
                status === 'COMPLETED'
                    ? {
                        open: true,
                        message: '🎉 Quiz passed successfully! Well done.',
                        color: '#7B68EE',
                    }
                    : {
                        open: true,
                        message: '❌ Quiz failed. Better luck next time.',
                        color: '#DC2626',
                    };

            dispatch(setSnackbar(snackbarConfig))

            const answersArray = questions?.map((q, index) => {
                const userAnswer = answers[index];

                return {
                    quiz_question_id: q.id,

                    selected_option:
                        q.question_type === "MCQ"
                            ? optionIndexToLetter(userAnswer)
                            : null,

                    selected_options:
                        q.question_type === "MAQ"
                            ? userAnswer.map(optionIndexToLetter)
                            : null,

                    selected_boolean:
                        q.question_type === "BOOLEAN"
                            ? (userAnswer ? 1 : 0)
                            : null,

                    is_correct: isAnswerCorrect(q, userAnswer) ? 1 : 0
                };
            });

            await completeQuizAttempt({
                attemptId,
                score,
                totalQuestions: questions.length,
                status,
                answersArray,
            });

            setQuestions([]);
            setAnswers({});
            setAttemptId(null);
            setApiDataAndNotify(new Date())

            navigation.goBack();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to save quiz");
        }
    };


    return (
        <View style={styles.container}>
            {/* Enhanced Header with Marine Theme */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <View style={styles.anchorIcon}>
                            <Ionicons name="anchor" size={16} color="#0369A1" />
                        </View>
                        <View>
                            <Text style={styles.questionNumber}>Question {currentQuestion + 1}</Text>
                            <Text style={styles.totalQuestions}>of {totalQuestions}</Text>
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <View style={styles.answeredBadge}>
                            <Ionicons name="checkmark-done" size={14} color="#059669" />
                            <Text style={styles.answeredText}>{answeredCount}/{totalQuestions}</Text>
                        </View>
                        <View style={styles.timerContainer}>
                            <Ionicons name="timer-outline" size={16} color="#DC2626" />
                            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                        </View>
                    </View>
                </View>

                {/* Wave-styled Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]}>
                            <View style={styles.progressWave} />
                        </View>
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {/* Question Card with Maritime Design */}
                <View style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                        <View style={styles.questionBadge}>
                            <Ionicons
                                name={
                                    question?.question_type === 'BOOLEAN' ? 'swap-horizontal' :
                                        question?.question_type === 'MAQ' ? 'list-outline' : 'list'
                                }
                                size={14}
                                color="#FFF"
                            />
                            <Text style={styles.questionType}>
                                {question?.question_type === 'BOOLEAN' ? 'True or False' :
                                    question?.question_type === 'MAQ' ? 'Multiple Answer' : 'Multiple Choice'}
                            </Text>
                        </View>
                        <View style={styles.compass}>
                            <Ionicons name="compass-outline" size={20} color="#0284C7" />
                        </View>
                    </View>
                    <Text style={styles.questionText}>
                        {question?.question_text || 'Loading question...'}
                    </Text>
                </View>

                {/* Options with Enhanced Styling */}
                <View style={styles.optionsContainer}>
                    {question?.question_type === 'BOOLEAN' ? (
                        <View style={styles.booleanContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.booleanOption,
                                    styles.trueOption,
                                    answers[currentQuestion] === true && styles.selectedTrueOption
                                ]}
                                onPress={() => handleAnswer(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.booleanIconWrapper}>
                                    <View style={[
                                        styles.checkCircle,
                                        answers[currentQuestion] === true && styles.checkCircleActive
                                    ]}>
                                        <Ionicons
                                            name="checkmark"
                                            size={24}
                                            color={answers[currentQuestion] === true ? '#FFF' : '#10B981'}
                                        />
                                    </View>
                                </View>
                                <Text style={[
                                    styles.booleanText,
                                    answers[currentQuestion] === true && styles.selectedTrueText
                                ]}>True</Text>
                                {answers[currentQuestion] === true && (
                                    <Ionicons name="radio-button-on" size={20} color="#10B981" />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.booleanOption,
                                    styles.falseOption,
                                    answers[currentQuestion] === false && styles.selectedFalseOption
                                ]}
                                onPress={() => handleAnswer(false)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.booleanIconWrapper}>
                                    <View style={[
                                        styles.crossCircle,
                                        answers[currentQuestion] === false && styles.crossCircleActive
                                    ]}>
                                        <Ionicons
                                            name="close"
                                            size={24}
                                            color={answers[currentQuestion] === false ? '#FFF' : '#EF4444'}
                                        />
                                    </View>
                                </View>
                                <Text style={[
                                    styles.booleanText,
                                    answers[currentQuestion] === false && styles.selectedFalseText
                                ]}>False</Text>
                                {answers[currentQuestion] === false && (
                                    <Ionicons name="radio-button-on" size={20} color="#EF4444" />
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (question?.question_type === 'MCQ' || question?.question_type === 'MAQ') ? (
                        [
                            question?.option_a,
                            question?.option_b,
                            question?.option_c,
                            question?.option_d
                        ]
                            .filter(option => option !== null) // Remove null options
                            .map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.mcqOption,
                                        answers[currentQuestion] === index && styles.selectedMcqOption
                                    ]}
                                    onPress={() => handleAnswer(index)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.mcqLeft}>
                                        <View style={[
                                            styles.optionCircle,
                                            answers[currentQuestion] === index && styles.optionCircleSelected
                                        ]}>
                                            <Text style={[
                                                styles.optionLetter,
                                                answers[currentQuestion] === index && styles.optionLetterSelected
                                            ]}>
                                                {String.fromCharCode(65 + index)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[
                                        styles.optionText,
                                        answers[currentQuestion] === index && styles.selectedOptionText
                                    ]}>
                                        {option}
                                    </Text>
                                    {answers[currentQuestion] === index && (
                                        <Ionicons name="checkmark-circle" size={22} color="#0369A1" style={styles.checkIcon} />
                                    )}
                                </TouchableOpacity>
                            ))
                    ) : null}
                </View>

            </ScrollView>

            {/* Enhanced Navigation Footer */}
            <View style={styles.navigationContainer}>
                <TouchableOpacity
                    style={[
                        styles.navButton,
                        styles.previousButton,
                        currentQuestion === 0 && styles.navButtonDisabled
                    ]}
                    onPress={handlePrevious}
                    disabled={currentQuestion === 0}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="chevron-back-circle"
                        size={22}
                        color={currentQuestion === 0 ? '#CBD5E1' : '#0369A1'}
                    />
                    <Text style={[
                        styles.navButtonText,
                        currentQuestion === 0 && styles.navButtonTextDisabled
                    ]}>
                        Previous
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.navButton, styles.nextButton]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextButtonText}>
                        {currentQuestion === totalQuestions - 1 ? 'Finish Quiz' : 'Next'}
                    </Text>
                    <Ionicons
                        name={currentQuestion === totalQuestions - 1 ? 'checkmark-circle' : 'chevron-forward-circle'}
                        size={22}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F9FF',
        padding: 16,
    },
    header: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        borderBottomWidth: 2,
        borderRadius: 16,
        borderBottomColor: '#BAE6FD',
        shadowColor: '#0369A1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    anchorIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    questionNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0C4A6E',
    },
    totalQuestions: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    answeredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    answeredText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    timerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#DC2626',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E0F2FE',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#0284C7',
        borderRadius: 4,
        position: 'relative',
    },
    progressWave: {
        position: 'absolute',
        right: -2,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#0369A1',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0369A1',
        minWidth: 35,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    questionCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#0369A1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#0284C7',
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    questionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0284C7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    questionType: {
        fontSize: 11,
        color: '#FFF',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    compass: {
        opacity: 0.3,
    },
    questionText: {
        fontSize: 17,
        color: '#0F172A',
        lineHeight: 26,
        fontWeight: '600',
    },
    optionsContainer: {
        marginBottom: 16,
    },
    booleanContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    booleanOption: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        gap: 12,
    },
    trueOption: {
        borderColor: '#D1FAE5',
    },
    selectedTrueOption: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    falseOption: {
        borderColor: '#FEE2E2',
    },
    selectedFalseOption: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    booleanIconWrapper: {
        marginBottom: 4,
    },
    checkCircle: {
        width: 36,
        height: 36,
        borderRadius: 28,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#10B981',
    },
    checkCircleActive: {
        backgroundColor: '#10B981',
    },
    crossCircle: {
        width: 36,
        height: 36,
        borderRadius: 28,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    crossCircleActive: {
        backgroundColor: '#EF4444',
    },
    booleanText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#64748B',
    },
    selectedTrueText: {
        color: '#059669',
    },
    selectedFalseText: {
        color: '#DC2626',
    },
    mcqOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E0F2FE',
        gap: 12,
    },
    selectedMcqOption: {
        borderColor: '#0369A1',
        backgroundColor: '#F0F9FF',
        shadowColor: '#0369A1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    mcqLeft: {
        justifyContent: 'center',
    },
    optionCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#BAE6FD',
    },
    optionCircleSelected: {
        backgroundColor: '#0369A1',
        borderColor: '#0369A1',
    },
    optionLetter: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0369A1',
    },
    optionLetterSelected: {
        color: '#FFF',
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        color: '#334155',
        lineHeight: 22,
        fontWeight: '500',
    },
    selectedOptionText: {
        color: '#0C4A6E',
        fontWeight: '600',
    },
    checkIcon: {
        marginLeft: 8,
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 16,
        borderTopWidth: 2,
        borderTopColor: '#BAE6FD',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 5,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        flex: 1,
    },
    previousButton: {
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#0369A1',
        maxWidth: '40%',
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    navButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0369A1',
    },
    navButtonTextDisabled: {
        color: '#CBD5E1',
    },
    nextButton: {
        backgroundColor: '#0369A1',
        justifyContent: 'center',
        shadowColor: '#0369A1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    nextButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
});

export default QuizQuestionScreen;