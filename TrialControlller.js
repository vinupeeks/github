const transporter = require('../helper/nodemailer');
const db = require('../models')
const User = db.users
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const handlebars = require("handlebars");
const moment = require('moment');
const { scoreMapTemplate } = require('../config/scoreMapTemplate');
const { flattenScoreMap } = require('../utils/flattenScoreMap');
const { AUTHSECRET } = require('../config/auth.config');
const jwt = require('jsonwebtoken');
const ScoreMap = db.scoreMap
const Role = db.roles
const Fleet = db.fleets
const Super = db.superintendents
const Vessel = db.vessels
const VesselInspections = db.vesselInspections
const InspectionQuestions = db.inspectionQuestions
const InspectionScore = db.inspectionScore
const Op = db.Sequelize.Op

const compileTemplate = (templateName, data) => {
    const filePath = path.join(__dirname, "../template/", `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, "utf8");
    const template = handlebars.compile(source);
    return template(data);
};

const createTrial = async (req, res) => {
    try {

        const { email, name, mobile, company_name, fullVersion } = req.body;

        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res.status(400).json({ message: 'Already used this email' });
        }

        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const plainPassword = `SIRE${randomNumber}`;

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);

        const newUser = await User.create({
            fullname: name,
            email,
            mobile: mobile ? mobile : null,
            company_name: company_name,
            password: hashedPassword,
            registered_via: "trial",
            vessel_count: 5,
            role_id: 2,
            last_subscription_date: today,
            subscription_valid_till: nextMonth,
            subscription: fullVersion ? "Pending" : "Trial"
        });

        await sendMail({
            fullname: name,
            email,
            company_name,
            password: plainPassword,
        })

        const rows = flattenScoreMap(scoreMapTemplate, newUser.id);
        await ScoreMap.bulkCreate(rows);

        if (fullVersion) {

            const user = await User.findOne({
                where: { [Op.and]: [{ id: newUser.id }] },
                include: [{ model: Role, attributes: ['role'] }]
            })

            const token = jwt.sign({
                id: user.id
            }, AUTHSECRET);

            return res.status(200).json({
                message: "Success",
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    fullname: user.fullname,
                    roleid: user.role_id,
                    role: user.role,
                    jwttoken: token,
                    subscription: user.subscription,
                    last_subscription_date: user.last_subscription_date,
                    createdAt: user.createdAt
                }
            });
        } else {
            await createDemoNoRollback({ userId: newUser.id })
        }

        return res.status(200).json({
            message: 'Trial account created successfully',
            success: true,
            data: {
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Error creating trial account:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error',
            success: false
        });
    }
};

const sendMail = async ({ fullname, company_name, email, password, fullVersion }) => {
    try {

        const data = {
            web_link: `${process.env.FRONTENDURL}/login`,
            fullname,
            company_name,
            email,
            password,
            year: moment().format("YYYY")
        }

        const htmlContent = compileTemplate("trial_registration_template", data);

        const mailOptions = {
            from: {
                name: process.env.SMTPEMAIL,
                address: process.env.SMTPEMAIL
            },
            to: email,
            subject: `Welcome to SIRE 2.0 ANALYTICS`,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        if (process.env.DEV_FLAG === "PRODUCTION") {
            const mailOptionsAdmin = {
                from: {
                    name: process.env.SMTPEMAIL,
                    address: process.env.SMTPEMAIL
                },
                to: "info@solmarinetech.com",
                bcc: ["vipin@solminds.com", "godwin@solminds.com"], // Add multiple emails
                subject: `New ${fullVersion ? 'Full version' : 'Trial'} access request for SIRE 2.0 Prep`,
                html: htmlContent,
            };
            await transporter.sendMail(mailOptionsAdmin);
        }


    } catch (err) {
        console.log(err)
    }
}

async function createDemoNoRollback({
    userId,
    fleetName = 'Demo Fleet',
    superName = 'Demo Superintendent',
    vesselName = 'Demo vessel',
    reportDate = '2024-10-30',
    reportName = 'sample_data.pdf'
}) {
    if (!userId) throw new Error('userId is required')
    if (!Array.isArray(inspectionQuestions) || inspectionQuestions.length === 0) {
        throw new Error('Global inspectionQuestions must be a non-empty array')
    }
    if (!Array.isArray(inspectionScores) || inspectionScores.length === 0) {
        throw new Error('Global inspectionScores must be a non-empty array')
    }

    // 1) Fleet, Superintendent, Vessel
    const fleet = await Fleet.create({ user_id: userId, name: fleetName })
    const spr = await Super.create({ user_id: userId, fleet_id: fleet.id, name: superName })
    const vessel = await Vessel.create({
        user_id: userId,
        fleet_id: fleet.id,
        super_id: spr.id,
        name: vesselName
    })

    // 2) Inspection
    const inspection = await VesselInspections.create({
        user_id: userId,
        vessel_id: vessel.id,
        super_id: spr.id,
        fleet_id: fleet.id,
        report_date: reportDate,
        report_name: reportName
    })

    // 3) Questions — preserve order to map original -> created
    const originalIdsInOrder = inspectionQuestions.map(q => q.id ?? null)

    const questionPayload = inspectionQuestions.map(q => ({
        inspection_id: inspection.id, // override incoming inspection_id
        viq: q.viq,
        tag: q.tag,
        question: q.question,
        chapter_no: q.chapter_no
    }))

    let createdQuestions = await InspectionQuestions.bulkCreate(questionPayload, { returning: true })

    const oldToNewQuestionId = {}
    const viqToQuestionId = {}
    for (let i = 0; i < createdQuestions.length; i++) {
        const created = createdQuestions[i]
        const oldId = originalIdsInOrder[i]
        if (oldId != null) oldToNewQuestionId[oldId] = created.id
        const viq = inspectionQuestions[i]?.viq
        if (viq) viqToQuestionId[viq] = created.id
    }

    const scoresPayload = inspectionScores.map(s => {
        let targetQid = null
        if (s.viq && viqToQuestionId[s.viq]) targetQid = viqToQuestionId[s.viq]
        else if (s.question_id && oldToNewQuestionId[s.question_id]) targetQid = oldToNewQuestionId[s.question_id]

        return {
            question_id: targetQid,
            negative: s.negative,
            noc: s.noc,
            soc: s.soc,
            remark: s.remark,
            category: s.category,
            score: s.score,
            isNegative: s.isNegative,
            operator_comments: s.operator_comments || null,
            pif: s.pif || null,
            tmsa: s.tmsa || null
        }
    })

    const badIdx = scoresPayload.findIndex(sp => !sp.question_id)
    if (badIdx !== -1) {
        const src = inspectionScores[badIdx]
        throw new Error(
            `Score at index ${badIdx} could not resolve a question_id. ` +
            `Provide 'viq' on the score or ensure its 'question_id' (${src.question_id}) exists in inspectionQuestions.`
        )
    }

    const createdScores = await InspectionScore.bulkCreate(scoresPayload, { returning: true })

    return {
        fleet,
        superintendent: spr,
        vessel,
        inspection,
        questions: createdQuestions,
        scores: createdScores,
        maps: { oldToNewQuestionId, viqToQuestionId }
    }
}


module.exports = {
    createTrial
};

const inspectionQuestions = [
    {
        id: 41,
        inspection_id: 148,
        viq: '2.4.1.',
        tag: 'Core',
        chapter_no: 2,
        question: 'Were the senior officers familiar with the company procedure for reporting defects to vessel structure, machinery and equipment to shore-based management through the company defect reporting system and was evidence available to demonstrate that all defects had been reported accordingly?'
    },
    {
        id: 42,
        inspection_id: 148,
        viq: '2.4.2.',
        tag: 'Core',
        chapter_no: 2,
        question: 'Where defects existed to the vessel’s structure, machinery or equipment, had the vessel operator notified class, flag and/or the authorities in the port of arrival, as appropriate to the circumstances, and had short term certificates, waivers, exemptions and/or permissions to proceed the voyage been issued where necessary?',
    },
    {
        id: 43,
        inspection_id: 148,
        viq: '2.8.1.',
        tag: 'Core',
        chapter_no: 2,
        question: 'Was the OCIMF Harmonised Vessel Particulars Questionnaire (HVPQ) available through the OCIMF SIRE Programme database completed accurately to reflect the structure, outfitting, management and certification of the vessel?'
    },
    {
        id: 44,
        inspection_id: 148,
        viq: '4.3.2.',
        tag: 'Core',
        chapter_no: 4,
        question: 'Were the engineer officers familiar with the company procedures defining machinery space operating mode and, where required to be attended, the machinery space team composition during the various stages of a voyage, and were records available to confirm the machinery space had been operated accordingly?'
    },
    {
        id: 45,
        inspection_id: 148,
        viq: '5.4.8.',
        tag: 'Rotational 2',
        chapter_no: 5,
        question: 'Were the Master, officers and ratings familiar with the lifejackets and personal flotation devices (PFDs) provided on board, and was the equipment in good condition, and properly maintained?'
    },
    {
        id: 46,
        inspection_id: 148,
        viq: '5.7.4.',
        tag: 'Rotational 1',
        chapter_no: 5,
        question: 'Were the Master, officers and ratings familiar with the company work planning procedures and were records available to demonstrate that onboard work planning meetings had been conducted and documented in accordance with the procedures?'
    }
]

const inspectionScores = [
    {
        question_id: 41,
        negative: 'Observable or detectable deficiency',
        noc: 'Sudden failure – maintenance tasks available and up to date',
        soc: 'Gyro Plants, Autopilots, Compasses',
        remark: 'The gyro repeater on the stbd. bridge wing was indicating 211 degrees and the port bridge wing was indicating 209 degrees, whilst the Master gyro was showing a heading of 099.5 degrees.',
        category: 'hardware',
        score: 3,
        operator_comments: [{"date":"11 Nov 2024 12:03","name":"Captain XYZ","immediateCause":"During the course of inspection, the inspector noted that the gyro repeaters were not in sync with the Master gyro and were showing different headings.","category":"hardware"}],
        isNegative: 'yes'
    },
    {
        question_id: 42,
        negative: 'Observable or detectable deficiency',
        noc: 'Maintenance deferred – awaiting technician',
        soc: 'Exhaust Gas Systems',
        remark: "The exhaust gas cleaning system had an alarm 'PSF 003 Gas Analyzer Power signal failure'. Investigation attributed this to a signal transmission failure from gas analyzer to main control panel. Communication with maker's was available and a technician attendance was awaited. This issue occured and was recorded on 16-May-2024.",
        category: 'hardware',
        score: 5,
        pif: [{"pifNumber":"2","pifDescription":"Custom and practice surrounding use of procedures"}],
        isNegative: 'yes'
    },
    {
        question_id: 42,
        negative: 'Not as expected',
        noc: '2. Custom and practice surrounding use of procedures',
        soc: 'Engine room team task - historical',
        remark: "The exhaust gas cleaning system had an alarm 'PSF 003 Gas Analyzer Power signal failure'. There was no communication available that the issue had been reported to Class or Flag. The issue was included within the onboard defect reporting system.",
        category: 'human',
        operator_comments: [{"date":"11 Nov 2024 12:03","name":"Captain XYZ","immediateCause":"During the course of inspection, the inspector noted that the exhaust gas cleaning system had an alarm 'PSF 003 Gas Analyzer Power signal failure' which was not reported to Flag or class.","rootCause":"Vessel has not informed class or flag of the issue as the alarm does not affect the performance of the Exhaust Gas Cleaning System to meet the IMO 2020 regulation of reducing the Sulphur content to 0.5% / SECA (Sulphur emission control area) 0.1%.","correctiveAction":"A letter has been obtained as attached from the makers confirming that this single sensor failure condition does not affect the performance of the Exhaust Gas Cleaning System and there is no need to switch to compliance fuel. Since there is no non-compliance hence no need to inform flag or class.","preventativeAction":"We are Liaising with makers for an engineer to attend and resolve the fault. Guidance from the makers will be sought to discuss failure issues, regarding any recommended preventive maintenance and the minimum spare parts required to maintain on board after the maker’s engineer has addressed the issue. Upon discussion with owners the spares advised shall be added in PMS and kept as spare onboard.","category":"human"}],
        score: 6,
        isNegative: 'yes'
    },
    {
        question_id: 43,
        negative: 'Not as expected – procedure and/or document deficient.',
        noc: 'Procedure accuracy/correctness',
        soc: '1A.1.5 - Formal document control system',
        remark: 'The following information was not accurately updated within the HVPQ: (i) Dedicated Rescue boat (5.3.8): N/A; (ii) Ballast tank inspection frequency (7.1.3): 9 months; (iii) Ballast tank inspection dates (7.1.3): 12-Feb-2024 to 15-Feb-2024; (iv) Last annual inspection for cranes (10.9.1): 10-Sep-2024.',
        category: 'process',
        score: 4,
        tmsa: '1A.1.5',
        isNegative: 'yes'
    },
    {
        question_id: 44,
        negative: 'Not as expected',
        noc: '2. Custom and practice surrounding use of procedures',
        soc: 'Senior Engineer Officer',
        remark: 'The OP could not provide any log or records to indicate that the required machinery space status that was required within the passage plan had been complied with, for the previous voyage.',
        category: 'human',
        score: 6,
        isNegative: 'yes'
    },
    {
        question_id: 45,
        negative: 'Not as expected – procedure and/or document deficient.',
        noc: 'Procedure not present/available/accessible',
        soc: '9A.1.1 - Safety inspections by the designated safety officer',
        remark: 'There were no maintenance/ inspection procedures available for the 6 nos. working vests that were being used for the working outboard or in vicinity of the ship side.',
        category: 'process',
        score: 5,
        tmsa: '9A.1.1',
        isNegative: 'yes'
    },
    {
        question_id: 46,
        negative: 'Not as expected',
        noc: '1. Recognition of Safety criticality of the task or associated steps',
        soc: 'Senior Deck Officer',
        remark: 'The records being maintained for the work planning meeting were not reflecting the jobs that were actually carried out/ executed. For the last 10 day records that were reviewed the tasks were repetitive (i.e. Greasing of winches/ windlass, cosmetic upgradation between frames 72-84, etc.).',
        category: 'human',
        score: 5,
        pif: [{"pifNumber":"1","pifDescription":"Recognition of Safety criticality of the task or associated steps"}],
        isNegative: 'yes'
    }
]