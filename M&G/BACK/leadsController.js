const { Op, Sequelize, where } = require('sequelize');
const db = require('../models/index');
const { getPagination, getPagingData } = require('../helpers/pagination');
const moment = require('moment');
const Leads = db.leads;
const User = db.user;
const ProspectStatus = db.prospectStatus;
const TourPackages = db.tourPackages;
const Members = db.members;
const TravelDetails = db.travelDetails;
const TravelType = db.travelType;
const PackageSchedule = db.packageSchedule;
const LeadItineraryPlan = db.leadItineraryPlan;
const Modeofcontact = db.modeofcontact
const Reference = db.reference;
const TravelHub = db.travelHub;
const LeadsFollowUp = db.leadsFollowUp;
const LeadsDestinations = db.leadDestinations;
const Country = db.country;
const Branch = db.branches;
const Airline = db.airline;
const Airport = db.airport;
const LeadAmountHistory = db.leadamounthistory


// List all leads with pagination 
exports.leadsList = async (req, res) => {
    try {
        const { current_role, branch_id, id: userId } = req.user;
        const {
            first_name, mobile, email, age, address, assigned_to, leader,
            lead_status, status_id, travel_type, ticket_type, package_id,
            travel_from_date, travel_to_date, departure_time, arrival_time,
            lead_itinerary_id, primary_reference_id, reference_id,
            start_date, end_date, isCompleted, page, size,
            destination_id, created_from_date, created_to_date, customer_type, primary_reference, secondary_reference
        } = req.body;

        const { limit, offset } = getPagination(page, size);
        const searchAttributes = { limit, offset };

        // Common filters
        const nameFilter = first_name ? { first_name: { [Op.like]: `%${first_name}%` } } : {};
        const mobileFilter = mobile
            ? {
                [Op.or]: [
                    { mobile: { [Op.like]: `%${mobile}%` } },
                    { wapp_number: { [Op.like]: `%${mobile}%` } }
                ]
            }
            : {};
        const emailFilter = email ? { email: { [Op.like]: `%${email}%` } } : {};
        const ageFilter = age ? { age: { [Op.like]: `%${age}%` } } : {};
        const addressFilter = address ? { address: { [Op.like]: `%${address}%` } } : {};
        const leadStatusFilter = lead_status ? { lead_status } : {};
        const destinationFilter = destination_id ? { destination_id } : {};
        const customertypeFilter = customer_type ? { customer_type } : {};

        // Assigned user logic
        let usersId = [];
        if (current_role === "BH") {
            const users = await User.findAll({
                where: { status: 'Active', branch_id }
            });
            usersId = users.map(user => user.id);
        }

        const assignToFilter = assigned_to
            ? { assigned_to }
            : current_role === "ADMIN" || current_role === "MD"
                ? {}
                : current_role === "BH"
                    ? { assigned_to: { [Op.in]: usersId } }
                    : { assigned_to: userId };

        // Status & completed logic
        // const statusIdFilter =
        //     status_id === "All" ? { status_id: { [Op.notIn]: [7, 9] } } :
        //     status_id === "Yes" ? { status_id: { [Op.in]: [4] } } :
        //     status_id === "No" ? { status_id: { [Op.in]: [1, 2, 5, 6] } } :
        //     status_id ? { status_id } : { status_id: { [Op.notIn]: [7, 9] } };

        // const completedFilter = isCompleted ? { status_id: 7 } : { status_id: { [Op.notIn]: [7, 9] } }
        let statusIdFilter = {};

        if (isCompleted === true) {
            statusIdFilter = { status_id: 7 };
        } else if (status_id === "All") {
            statusIdFilter = { status_id: { [Op.notIn]: [7, 9] } };
        } else if (status_id === "Yes") {
            statusIdFilter = { status_id: { [Op.in]: [4] } };
        } else if (status_id === "No") {
            statusIdFilter = { status_id: { [Op.in]: [1, 2, 5, 6] } };
        } else if (status_id) {
            statusIdFilter = { status_id };
        } else {
            statusIdFilter = { status_id: { [Op.notIn]: [7, 9] } };
        }

        // Other filters
        const travelTypeFilter = travel_type ? { travel_type } : {};
        const ticketTypeFilter = ticket_type ? { ticket_type } : {};
        const packageIdFilter = package_id ? { package_id } : {};
        const leadItineraryFilter = lead_itinerary_id ? { lead_itinerary_id } : {};
        const primaryReferenceFilter = primary_reference ? { primary_reference_id: primary_reference } : {};
        const referenceFilter = secondary_reference ? { reference_id: secondary_reference } : {};
        const departureFilter = departure_time ? { departure_time } : {};
        const arrivalFilter = arrival_time ? { arrival_time } : {};
        const travelDateFilter = (start_date && end_date)
            ? { travel_from_date: { [Op.gte]: start_date, [Op.lte]: end_date } }
            : {};
        const createdAtFilter = (created_from_date && created_to_date)
            ? {
                createdAt: {
                    [Op.gte]: created_from_date,
                    [Op.lte]: new Date(new Date(created_to_date).setHours(23, 59, 59, 999))
                }
            }
            : {};

        const leaderFilter = leader ? { leader } : {};

        // Combined where conditions
        const mainWhereConditions = {
            ...assignToFilter,
            ...statusIdFilter,
            // ...completedFilter,
            ...travelTypeFilter,
            ...ticketTypeFilter,
            ...packageIdFilter,
            ...leadItineraryFilter,
            ...primaryReferenceFilter,
            ...referenceFilter,
            ...departureFilter,
            ...arrivalFilter,
            ...travelDateFilter,
            ...leaderFilter
        };

        const leadWhereConditions = {
            ...nameFilter,
            ...mobileFilter,
            ...emailFilter,
            ...ageFilter,
            ...addressFilter,
            ...leadStatusFilter,
            ...createdAtFilter,
            ...customertypeFilter,
            status: 'Active'
        };

        // Main query
        const travelDetailsResult = await TravelDetails.findAndCountAll({
            ...searchAttributes,
            order: [['updatedAt', 'DESC']],
            distinct: true,
            where: mainWhereConditions,
            include: [
                {
                    model: Leads,
                    as: 'leadId',
                    where: leadWhereConditions,
                    include: [
                        {
                            model: Members,
                            required: false,
                            // where: { status: { [Op.ne]: 'Inactive' } }
                        },
                        {
                            model: LeadsFollowUp,
                            where: { lead_status: { [Op.ne]: null } },
                            order: [['createdAt', 'DESC']],
                            limit: 1,
                            required: false
                        }
                    ]
                },
                {
                    model: LeadsDestinations,
                    attributes: ['id', 'destination_id'],
                    include: [{ model: Country, as: 'destinationId', required: false }],
                    where: destinationFilter,
                    required: destination_id ? true : false
                },
                { model: TravelType, as: 'travelId' },
                { model: User, as: 'assignedTo', include: [{ model: Branch, as: 'branchId' }] },
                { model: ProspectStatus, as: 'statusId' },
                { model: TourPackages, as: 'packageId' },
                { model: LeadItineraryPlan, as: 'itineraryId' },
                { model: PackageSchedule, as: 'packageScheduleId' },
                { model: Modeofcontact, as: 'primaryReferenceId' },
                { model: Reference, as: 'referenceId' },
                { model: TravelHub, as: 'travelHubId', required: false }
            ]
        });

        // Transform result
        const transformedRows = travelDetailsResult.rows.map(item => {
            const lead = item.leadId || {};
            const extractedLeadDestinations = item.leadDestinations || [];

            return {
                ...lead.dataValues,
                members: lead.members || [],
                leadDestinations: extractedLeadDestinations,
                leadsFollowUps: lead.leadsFollowUps || [],
                travelDetails: [{
                    ...item.dataValues,
                    leadId: undefined,
                    leadDestinations: undefined
                }]
            };
        });

        const responseData = getPagingData({
            count: travelDetailsResult.count,
            rows: transformedRows
        }, page, limit);

        res.status(200).json({
            success: true,
            data: responseData,
            message: 'Leads list fetched successfully!'
        });

    } catch (error) {
        console.error('Leads list fetch error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching leads list!'
        });
    }
};



// creation of leads
exports.leadsCreation = async (req, res) => {
    const { sub_destinations, destinations, pax_count, status, ...leadData } = req.body;
    const user = req.user;
    const leaderdata = pax_count > 1 ? 'Yes' : 'No';


    // console.log(req.body);
    let transaction;
    try {
        transaction = await db.sequelize.transaction();

        // 1. User Handling (Find or Create)
        const { lead_id, isExistingUser } = await handleUser(transaction, leadData, user);

        // 2. Validate Relations
        await validateRelations(transaction, leadData);

        // 3. Create Travel Details
        const travelDetailsData = {
            ...leadData,
            lead_id,
            status_id: leadData.status_id || 1,
            branch_id: user.branch_id,
            created_by: user.id,
            updated_by: user.id,
            leader: leaderdata,
            package_id: leadData.package_id || null,
            pax_count
        };
        const travelDetails = await TravelDetails.create(travelDetailsData, { transaction });
        const travelId = travelDetails.id;

        // 4. Create Amount History
        await LeadAmountHistory.create({
            userid: lead_id,
            travel_id: travelId,
            amount: leadData.total_cost,
            created_by: user.id,
            updated_by: user.id,
        }, { transaction });

        // 5. Handle Destinations
        // if (destinations?.length) {
        //     await handleDestinations(transaction, lead_id, destinations, user, travelId);
        // }
        if (destinations?.length || sub_destinations?.length) {
            await handleDestinations(transaction, lead_id, destinations, user, travelId, sub_destinations);
        }

        await transaction.commit();

        // 6. Get Complete Lead Data
        const completeLead = await getCompleteLead(lead_id);

        res.status(isExistingUser ? 200 : 201).json({
            success: true,
            data: completeLead,
            message: isExistingUser ? 'New travel record created for existing user' : 'New lead created successfully',
            isExistingUser
        });

    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Lead creation error:', error);
        res.status(500).json({ success: false, message: error.message || 'Lead creation error..!' });
    }
};

// Helper Functions
async function handleUser(transaction, leadData, user) {
    const { email, mobile, first_name, last_name, ...rest } = leadData;
    let lead_id, isExistingUser = false;

    if (mobile) {
        const whereClause = { status: 'Active' };
        // if (email) whereClause.email = email;
        if (mobile) whereClause.mobile = mobile;

        const existingUser = await Leads.findOne({ where: whereClause, transaction });

        if (existingUser) {
            isExistingUser = true;
            lead_id = existingUser.id;

            const updateData = {};
            if (first_name) updateData.first_name = first_name;
            if (last_name) updateData.last_name = last_name;

            if (Object.keys(updateData).length > 0) {
                await Leads.update(updateData, { where: { id: lead_id }, transaction });
            }
        }
    }

    if (!isExistingUser) {
        const newLead = await Leads.create({
            first_name,
            last_name,
            mobile,
            email,
            status: 'Active',
            ...rest,
            created_by: user.id,
            updated_by: user.id
        }, { transaction });
        lead_id = newLead.id;
    }

    return { lead_id, isExistingUser };
}

async function validateRelations(transaction, leadData) {
    const relations = [
        { field: 'package_schedule_id', model: PackageSchedule, message: 'Package Schedule not valid..!' },
        { field: 'lead_itinerary_id', model: LeadItineraryPlan, message: 'Lead Itinerary not valid..!' },
        { field: 'primary_reference_id', model: Modeofcontact, message: 'Primary Reference not valid..!' },
        { field: 'reference_id', model: Reference, message: 'Reference not valid..!' },
        { field: 'travel_hub', model: TravelHub, message: 'Travel Hub not valid..!' }
    ];

    for (const { field, model, message } of relations) {
        if (leadData[field]) {
            const isValid = await model.findOne({ where: { id: leadData[field] }, transaction });
            if (!isValid) throw new Error(message);
        }
    }
}


async function handleDestinations(transaction, lead_id, destinations, user, travelId, sub_destinations = []) {
    const destinationRecords = [];

    // Handle main destinations
    if (destinations?.length) {
        destinations.forEach(destination_id => {
            destinationRecords.push({
                lead_id,
                destination_id,
                sub_destination_id: null, // Important: set to null for main destinations
                travel_id: travelId,
                created_by: user.id,
                updated_by: user.id
            });
        });
    }

    // Handle sub-destinations
    if (sub_destinations?.length) {
        sub_destinations.forEach(sub_destination_id => {
            destinationRecords.push({
                lead_id,
                destination_id: null, // Important: set to null for sub-destinations
                sub_destination_id,
                travel_id: travelId,
                created_by: user.id,
                updated_by: user.id
            });
        });
    }

    // Bulk create all records at once
    if (destinationRecords.length > 0) {
        await LeadsDestinations.bulkCreate(destinationRecords, { transaction });
    }
}

async function getCompleteLead(lead_id) {
    return await Leads.findOne({
        where: { id: lead_id },
        include: [
            { model: TravelDetails, as: 'travelDetails' },
            // { model: LeadAmountHistory, as: 'amountHistory' },
            // { model: LeadsDestinations, as: 'destinations' }
        ]
    });
}

// check user existence
exports.checkUserExistence = async (req, res) => {
    const { mobile } = req.body;
    const user = req.user;

    try {
        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: 'Please provide mobile number'
            });
        }

        const whereClause = { status: 'Active' };
        // if (email) whereClause.email = email;
        if (mobile) whereClause.mobile = mobile;

        const existingUser = await Leads.findOne({
            where: whereClause,
            include: [
                {
                    model: TravelDetails,
                    as: 'travelDetails',
                    order: [['createdAt', 'DESC']]
                },
                // { model: LeadAmountHistory, as: 'amountHistory' },
                // { model: LeadsDestinations, as: 'destinations' }
            ]
        });

        if (existingUser) {
            return res.status(200).json({
                success: true,
                exists: true,
                data: existingUser,
                message: 'User found'
            });
        } else {
            return res.status(200).json({
                success: true,
                exists: false,
                data: null,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Error checking user existence:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking user existence',
            error: error.message
        });
    }
};

// leads details by Id
exports.leadsDetailsById = async (req, res) => {
    const id = req.params.id;
    // const travel_id = req.params.travel_id;
    try {
        const leadDetails = await TravelDetails.findOne({
            where: {
                id

            },
            include: [
                {
                    model: Leads, as: 'leadId', required: true,
                    include: [
                        { model: Members, required: false, where: { status: { [Op.ne]: 'Inactive', } } },

                    ]
                },
                { model: LeadsDestinations, attributes: ['id', 'destination_id', 'sub_destination_id', 'lead_id', 'travel_id'], required: false },
                { model: TravelType, as: 'travelId', attributes: ['id', 'name', 'label'], required: false },
                { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'mobile'], },
                { model: ProspectStatus, as: 'statusId', attributes: ['id', 'name', 'label'], },
                { model: TourPackages, as: 'packageId', required: false },
                { model: PackageSchedule, as: 'packageScheduleId', attributes: ['id', 'name', 'start_date', 'end_date'], required: false },
                { model: LeadItineraryPlan, as: 'itineraryId', attributes: ['id', 'name', 'label'], required: false },
                { model: Modeofcontact, as: 'primaryReferenceId', attributes: ['id', 'name'], required: false },
                { model: Reference, as: 'referenceId', attributes: ['id', 'name', 'label'], required: false },
                { model: Airline, as: 'airlineDetails', attributes: ['name', 'id'], required: false },
                { model: TravelHub, as: 'travelHubId', attributes: ['id', 'name', 'label'], required: false },
                { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'], required: false },
                { model: Airport, as: 'nearestAirport', attributes: ['id', 'name'], required: false },
            ],
        });
        if (leadDetails === null) {
            return res.status(400).json({ success: false, message: 'Lead not found..!' });
        }
        res.status(200).json({ success: true, data: leadDetails, message: 'Lead fetched Successfully..!' });
    } catch (error) {
        console.error('Error fetching the lead details..!', error);
        res.status(500).json({ success: false, message: error.message || 'Error fetching the Lead details..!' });
    }
};

// leads Updation by Id
exports.leadsUpdation = async (req, res) => {
    const { first_name, last_name, mobile, email, age, address, leader, travel_type, passport_number, passport_expire_date,
        has_traveled_abroad, wapp_number, ticket_type, assigned_to, lead_status, status, package_id, status_id, travel_with_in,
        travel_from_date, travel_to_date, departure_time, arrival_time, package_schedule_id, lead_itinerary_id, primary_reference_id, reference_id,
        members_count, rating, fit_amount, lead_note, pax_count, days, nights, travel_hub, airline, joining_direct, destinations,
        infants, children, adults, branch_id, amount, age_group, total_cost, meal, flag, package_schedule_not_yet_con, sub_destinations, customer_type,
        business_name, business_contact_number, nearest_airport, travel_month_year, meal_plan, other_preferences } = req.body;
    const travelDetailsId = req.params.id;
    const user = req.user;

    const transaction = await db.sequelize.transaction();

    try {
        let TravelId;
        const travelData = await TravelDetails.findOne({ where: { id: travelDetailsId }, transaction });

        if (!travelData) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Lead not found..!' });
        } else {
            TravelId = travelData.id;
        }

        const id = travelData.id;
        const leadId = travelData.lead_id;
        const currentLead = await Leads.findByPk(leadId, { transaction });

        if (!currentLead) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const normalizedEmail = email?.trim().toLowerCase();

        if (normalizedEmail && normalizedEmail !== currentLead.email) {
            const emailExists = await Leads.findOne({
                where: { email: normalizedEmail, id: { [Op.ne]: leadId } },
                transaction
            });

            if (emailExists) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "The email already exists, provide another one..!"
                });
            }
        }

        // if (email) {
        //     const existingEmail = await Leads.findOne({ where: { email, id: { [Op.ne]: travelData.lead_id } }, transaction });
        //     if (existingEmail) {
        //         await transaction.rollback();
        //         return res.status(400).json({ success: false, message: 'The email already exists, provide another one..!' });
        //     }
        // } 
        // if (mobile) {
        //     const existingMobile = await Leads.findOne({ where: { mobile, id: { [Op.ne]: travelData.lead_id } }, transaction });
        //     if (existingMobile) {
        //         await transaction.rollback();
        //         return res.status(400).json({ success: false, message: 'The phone number already exists, provide another one..!' });
        //     }
        // }
        if (lead_itinerary_id) {
            const leadItineraryPlanValide = await LeadItineraryPlan.findOne({ where: { id: lead_itinerary_id } });
            if (!leadItineraryPlanValide) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Lead Itinerary not valid..!' });
            }
        } if (primary_reference_id) {
            const primaryReferenceValide = await Modeofcontact.findOne({ where: { id: primary_reference_id }, transaction });
            if (!primaryReferenceValide) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Primary Reference not valid..!' });
            }
        } if (reference_id) {
            const referenceDataValide = await Reference.findOne({ where: { id: reference_id } });
            if (!referenceDataValide) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Reference not valid..!' });
            }
        } if (branch_id) {
            const branchIsValide = await Branch.findOne({ where: { id: branch_id }, transaction });
            if (!branchIsValide) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Branch not valid..!' });
            }
        } if (travel_hub) {
            const travelHubDataValide = await TravelHub.findOne({ where: { id: travel_hub }, transaction });
            if (!travelHubDataValide) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Travel Hub not valid..!' });
            }
        }

        const updateData = {
            first_name,
            last_name,
            mobile,
            email,
            age,
            customer_type,
            address,
            passport_number,
            passport_expire_date,
            has_traveled_abroad,
            wapp_number,
            lead_status,
            status,
            updated_by: user.id,
        };

        const [updatedRows] = await Leads.update(updateData, { where: { id: travelData.lead_id }, transaction });
        if (!updatedRows) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Update failed..!' });
        }

        if (travel_type || ticket_type || package_id || travel_with_in || travel_from_date || travel_to_date ||
            lead_itinerary_id || primary_reference_id || reference_id || members_count || rating || fit_amount || lead_note || pax_count ||
            package_schedule_id || departure_time || arrival_time || days || nights || travel_hub || airline ||
            joining_direct || infants || children || adults || branch_id || amount || age_group || total_cost ||
            assigned_to || leader || status_id || business_name || business_contact_number || nearest_airport || travel_month_year ||
            meal_plan || other_preferences) {

            const paxCountNum = Number(pax_count);

            const travelUpdateData = {
                travel_type,
                ticket_type,
                package_id: package_id || null,
                lead_itinerary_id: lead_itinerary_id || null,
                primary_reference_id: primary_reference_id || null,
                reference_id: reference_id || null,
                members_count: members_count || null,
                rating: rating || null,
                fit_amount: fit_amount || null,
                pax_count: pax_count || null,
                lead_note: lead_note || null,
                days: days || null,
                nights: nights || null,
                travel_hub: travel_hub || null,
                airline: airline || null,
                joining_direct: joining_direct || 'No',
                package_schedule_id: package_schedule_id || null,
                travel_with_in: travel_with_in || null,
                travel_from_date: travel_from_date || null,
                travel_to_date: travel_to_date || null,
                departure_time: departure_time || null,
                arrival_time: arrival_time || null,
                infants: infants || null,
                children: children || null,
                adults: adults || null,
                amount: amount || null,
                total_cost: total_cost || null,
                age_group: age_group || null,
                branch_id: branch_id || null,
                meal: meal || null,
                flag: flag || null,
                assigned_to,
                leader: Number.isFinite(paxCountNum) && paxCountNum > 1 ? "Yes" : "No",
                business_name: business_name || null,
                business_contact_number: business_contact_number || null,
                nearest_airport: nearest_airport || null,
                travel_month_year: travel_month_year || null,
                meal_plan: meal_plan || null,
                other_preferences: other_preferences || null,
                // status_id: status_id,
                updated_by: user.id,
                package_schedule_not_yet_con,
            };
            const existingTravel = await TravelDetails.findOne({ where: { id }, transaction });

            if (existingTravel) {
                await TravelDetails.update(travelUpdateData, { where: { id }, transaction });
            } else {
                const Details = await TravelDetails.create({ ...travelUpdateData, id }, { transaction });
                TravelId = Details.id;
            }
        }
        if (lead_status || status_id || assigned_to || status) {
            const data = {
                assigned_to,
                member_status: lead_status,
                status_id,
                status,
                updated_by: user.id,
            }
            const memberStatusUpdation = await Members.update(data, { where: { lead_id: travelData.lead_id }, transaction });
        }

        // if (destinations && destinations.length > 0) {
        //     await handleDestinationUpdates(transaction, travelData.lead_id, destinations, user, TravelId);
        // }
        if ((destinations && destinations.length > 0) || (sub_destinations && sub_destinations.length > 0)) {
            await handleDestinationUpdates(transaction, travelData.lead_id, destinations, user, TravelId, sub_destinations);
        }

        const leadAmountHist = await LeadAmountHistory.create({
            userid: travelData.lead_id,
            travel_id: id,
            amount: total_cost,
            created_by: user.id,
            updated_by: user.id,

        }, { transaction })

        await transaction.commit();
        const leadDetails = await Leads.findByPk(travelData.lead_id, { include: TravelDetails });

        res.status(201).json({ success: true, data: leadDetails, leadAmountHist: leadAmountHist, message: 'Lead updated Successfully..!' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating the lead details..!', error);
        res.status(500).json({ success: false, message: error.message || 'Lead updation error..!' });
    }
};


// lead deletion
async function handleDestinationUpdates(transaction, lead_id, destinations = [], user, TravelId, sub_destinations = []) {
    // Get existing destinations and sub-destinations
    const existingRecords = await LeadsDestinations.findAll({
        where: { lead_id },
        attributes: ['destination_id', 'sub_destination_id'],
        raw: true
    });

    // Separate existing destinations and sub-destinations
    const existingDestinations = existingRecords
        .filter(record => record.destination_id !== null)
        .map(record => parseInt(record.destination_id));

    const existingSubDestinations = existingRecords
        .filter(record => record.sub_destination_id !== null)
        .map(record => parseInt(record.sub_destination_id));

    // Helper function to safely convert to integer
    const safeParseInt = (value) => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? null : parsed;
    };

    // Clean and parse input arrays, filter out invalid values
    const cleanDestinations = destinations
        .map(id => safeParseInt(id))
        .filter(id => id !== null);

    const cleanSubDestinations = sub_destinations
        .map(id => safeParseInt(id))
        .filter(id => id !== null);

    // Calculate what needs to be added/removed for DESTINATIONS
    const newDestinations = cleanDestinations.filter(id => !existingDestinations.includes(id));
    const removedDestinations = existingDestinations.filter(id => !cleanDestinations.includes(id));

    // Calculate what needs to be added/removed for SUB-DESTINATIONS
    const newSubDestinations = cleanSubDestinations.filter(id => !existingSubDestinations.includes(id));
    const removedSubDestinations = existingSubDestinations.filter(id => !cleanSubDestinations.includes(id));

    // console.log('Debug info:', {
    //     existingDestinations,
    //     existingSubDestinations,
    //     cleanDestinations,
    //     cleanSubDestinations,
    //     newDestinations,
    //     newSubDestinations,
    //     removedDestinations,
    //     removedSubDestinations
    // });

    // Create new destination records
    if (newDestinations.length > 0) {
        const destinationCreate = newDestinations.map(destination_id => ({
            lead_id: parseInt(lead_id),
            travel_id: parseInt(TravelId),
            destination_id: destination_id,
            sub_destination_id: null,
            created_by: parseInt(user.id),
            updated_by: parseInt(user.id)
        }));

        await LeadsDestinations.bulkCreate(destinationCreate, { transaction });
    }

    // Create new sub-destination records
    if (newSubDestinations.length > 0) {
        const subDestinationCreate = newSubDestinations.map(sub_destination_id => ({
            lead_id: parseInt(lead_id),
            travel_id: parseInt(TravelId),
            destination_id: null,
            sub_destination_id: sub_destination_id,
            created_by: parseInt(user.id),
            updated_by: parseInt(user.id)
        }));

        console.log('Creating sub-destinations:', subDestinationCreate);
        await LeadsDestinations.bulkCreate(subDestinationCreate, { transaction });
    }

    // Remove deleted destination records
    if (removedDestinations.length > 0) {
        await LeadsDestinations.destroy({
            where: {
                travel_id: parseInt(TravelId),
                destination_id: removedDestinations,
                sub_destination_id: null
            },
            transaction
        });
    }

    // Remove deleted sub-destination records
    if (removedSubDestinations.length > 0) {
        await LeadsDestinations.destroy({
            where: {
                travel_id: parseInt(TravelId),
                destination_id: null,
                sub_destination_id: removedSubDestinations
            },
            transaction
        });
    }
}

exports.leadsDeletion = async (req, res) => {
    const id = req.params.id;
    const user = req.user;
    let transaction;

    try {
        transaction = await db.sequelize.transaction()

        const lead = await Leads.findByPk(id, { transaction });
        if (!lead) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Lead not found..!' });
        }
        const travel = await TravelDetails.findOne({ where: { lead_id: id } }, { transaction });
        if (!travel) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Lead travel details not found..!' });
        }

        const deletionData = {
            status: 'Deleted',
            updated_by: user.id,
        };
        const [deletedRows] = await Leads.update(deletionData, { where: { id }, transaction });

        if (!deletedRows) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Error deleting lead..!' });
        }

        const travelData = {
            status: 'Deleted',
            updated_by: user.id,
        }
        const [deletionTravel] = await TravelDetails.update(travelData, { where: { lead_id: id }, transaction });
        if (!deletionTravel) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Error deleting travel details..!' });
        }

        await transaction.commit();
        res.status(200).json({ success: true, message: 'Lead deleted Successfully..!' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error deleting the lead details..!', error);
        res.status(500).json({ success: false, message: error.message || 'Error deleting lead..!' });
    }
};

// // Group Leads creation
exports.groupLeadsCreation = async (req, res) => {
    const leadsList = req.body;
    const user = req.user;
    const t = await db.sequelize.transaction();

    try {
        if (!Array.isArray(leadsList) || leadsList.length === 0) {
            return res.status(400).json({ message: "Invalid leads data." });
        }

        const leaderData = leadsList.find(lead => lead.leader === "YES");

        if (!leaderData) {
            return res.status(400).json({ message: "No leader found in the provided leads." });
        }

        const membersData = leadsList.filter(lead => lead.leader !== "YES");

        const newLead = await Leads.create({
            first_name: leaderData.first_name,
            last_name: leaderData.last_name,
            mobile: leaderData.mobile,
            email: leaderData.email,
            age: leaderData.age,
            address: leaderData.address,
            passport_number: leaderData.passport_number,
            passport_expire_date: leaderData.passport_expire_date,
            has_traveled_abroad: leaderData.has_traveled_abroad,
            wapp_number: leaderData.wapp_number,
            customer_type: leaderData.customer_type,
            created_by: user.id,
            updated_by: user.id
        },
            { transaction: t }
        );

        const newTravelDetails = await TravelDetails.create({
            lead_id: newLead.id,
            travel_type: leaderData.travel_type,
            ticket_type: leaderData.ticket_type,
            travel_with_in: leaderData.travel_with_in,
            lead_itinerary_id: leaderData.lead_itinerary_id,
            primary_reference_id: leaderData.primary_reference_id,
            reference_id: leaderData.reference_id,
            members_count: leaderData.members_count,
            lead_note: leaderData.lead_note,
            pax_count: leaderData.pax_count,
            days: leaderData.days,
            nights: leaderData.nights,
            travel_hub: leaderData.travel_hub,
            airline: leaderData.airline,
            joining_direct: leaderData.joining_direct,
            travel_from_date: leaderData.travel_from_date,
            travel_to_date: leaderData.travel_to_date,
            package_id: leaderData.package_id || null,
            package_schedule_id: leaderData.package_schedule_id || null,
            rating: leaderData.rating || null,
            departure_time: leaderData.departure_time || null,
            arrival_time: leaderData.arrival_time || null,
            infants: leaderData.infants || null,
            children: leaderData.children || null,
            adults: leaderData.adults || null,
            amount: leaderData.amount || null,
            total_cost: leaderData.total_cost || null,
            age_group: leaderData.age_group || null,
            branch_id: leaderData.branch_id || null,
            assigned_to: leaderData.assigned_to,
            leader: leaderData.leader,
            fit_amount: leaderData.fit_amount,
            meal: leaderData.meal,
            flag: leaderData.flag,
            business_name: leaderData.business_name,
            business_contact_number: leaderData.business_contact_number,
            nearest_airport: leaderData.nearest_airport,
            travel_month_year: leaderData.travel_month_year,
            meal_plan: leaderData.meal_plan,
            other_preferences: leaderData.other_preferences,
            status_id: 1,
            created_by: user.id,
            updated_by: user.id
        },

            { transaction: t }
        )

        if (leaderData.destinations && leaderData.destinations.length > 0) {
            const destinationCreate = leaderData.destinations.map(destination => ({
                lead_id: newLead.id,
                destination_id: destination,
                created_by: user.id,
                updated_by: user.id
            }));
            await LeadsDestinations.bulkCreate(destinationCreate, { transaction: t });
        }

        const membersToCreate = membersData.map(member => ({
            lead_id: newLead.id,
            travel_details_id: newTravelDetails.id,
            first_name: member.first_name,
            last_name: member.last_name || null,
            mobile: member.mobile,
            email: member.email || null,
            age: member.age || null,
            address: member.address || null,
            passport_number: member.passport_number || null,
            passport_expire_date: member.passport_expire_date || null,
            has_traveled_abroad: member.has_traveled_abroad || null,
            wapp_number: member.wapp_number || null,
            assigned_to: leaderData.assigned_to || null,
            joining_direct: member.joining_direct || null,
            member_status: member.member_status || "HOT",
            status_id: 1,
            amount: member.amount || null,
            age_group: member.age_group || null,
            meal: member.meal || null,
            status: member.status || "Active",
            created_by: user.id,
            updated_by: user.id
        }));
        if (membersToCreate.length > 0) {
            await Members.bulkCreate(membersToCreate, { transaction: t });
        }
        await t.commit();

        return res.status(201).json({ success: true, message: "Leads and members saved successfully." });
    } catch (error) {
        await t.rollback();
        console.error('Error saving the group lead details..!', error);
        res.status(500).json({ success: false, message: error.message || 'Error saving group list..!' });
    }
};

// group members list using leader ID
exports.getGroupMembers = async (req, res) => {
    const leaderId = req.params.id;
    try {
        if (!leaderId) {
            return res.status(400).json({ success: false, message: "leaderId is required" });
        }
        const leaderDetails = await Leads.findOne({ where: { id: leaderId } });
        if (leaderDetails === null || !leaderDetails.leader === 'YES') {
            return res.status(400).json({ success: false, message: "The provided leaderId is not a leader" });
        }

        const members = await Members.findAndCountAll({ where: { lead_id: leaderId, status: { [Op.ne]: 'Deleted', } } });
        if (members.length === 0) {
            return res.status(404).json({ success: false, message: "No members found for this leader" });
        }

        res.status(201).json({ success: true, data: members, message: 'Leads members fetched successfully..!' });
    } catch (error) {
        console.error('Leads members fetch error:', error);
        res.status(500).json({ success: false, message: error.message || 'Error in leads members fetching..!' });
    }
};



exports.getTodaysLeadsFollowUps = async (req, res) => {
    const user = req.user.id;
    const user_roles = req.user_roles;
    const current_role = req.user.current_role;
    const page = req.query.page || 0;
    const size = req.query.size || 10;
    try {
        const todayStart = moment().startOf("day").toDate();
        const tomorrowStart = moment().add(1, "day").startOf("day").toDate();
        const { limit, offset } = getPagination(page, size);

        let whereCondition = {
            status: "Active"
        };

        if (current_role === 'ADMIN' || current_role === 'MD') {
            // Show all users’ follow-ups
            whereCondition.assigned_to = { [Op.ne]: null };
        } else {
            // Show only current user’s follow-ups
            whereCondition.assigned_to = user;
        }
        const todaysFollowups = await TravelDetails.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: User, as: 'assignedTo', attributes: ['id', 'username', 'name'],
                    include: [{ model: Branch, as: 'branchId', attributes: ['id', 'name', 'location'], }]
                },
                {
                    model: LeadsFollowUp,
                    where: {
                        followUp_status: 'Pending',
                        date: { [Op.gte]: todayStart, [Op.lt]: tomorrowStart },
                        lead_status: { [Op.ne]: null },
                        type: 'FOLLOW_UP',
                    },
                    required: true
                },
                {
                    model: LeadsFollowUp,
                    as: 'latestFollowUp',
                    where: {
                        lead_status: { [Op.ne]: null }
                    },
                    separate: true,
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                    required: false
                },
                {
                    model: Leads,
                    as: "leadId",
                    required: true,
                    include: [
                        { model: Members, required: false, where: { status: { [Op.ne]: 'Inactive', } } },

                    ]
                },
                { model: TravelType, as: 'travelId', attributes: ['id', 'name'], required: false },
                {
                    model: ProspectStatus,
                    as: "statusId",
                    where: {
                        id: { [Op.notIn]: [7, 9] }

                    }

                }
            ],
            limit: limit,
            offset: offset,
            distinct: true,
            order: [['id', 'DESC']]
        });

        // If no records found or count is 0, return the "no data" message
        if (!todaysFollowups || todaysFollowups.count === 0) {
            return res.status(200).json({
                success: true,
                message: "No follow-ups available for today",
                data: getPagingData({ count: 0, rows: [] }, page, limit)
            });
        }

        const paginatedResponse = getPagingData(todaysFollowups, page, limit)
        paginatedResponse.items = paginatedResponse.items.map(item => {
            const itemData = item.toJSON();

            if (itemData.leadId) {
                itemData.leadId.leadsFollowUps = itemData.leadsFollowUps || [];
                itemData.leadId.latestFollowUp = itemData.latestFollowUp || [];
            }
            delete itemData.leadsFollowUps;
            delete itemData.latestFollowUp;

            return itemData;
        });
        res.status(200).json({
            success: true,
            data: paginatedResponse
        });
    } catch (error) {
        console.error("Error fetching today's leads follow-ups:", error);
        res.status(500).json({ success: false, message: "Error fetching today's leads follow-ups!" });
    }
};


exports.completedLeadsList = async (req, res) => {
    try {
        const { page, size, ...searchParams } = req.body || {};
        const { limit, offset } = getPagination(page, size);
        let Searchattributes = { limit, offset };
        const user = req.user.id;
        const user_roles = req.user_roles;
        const current_role = req.user.current_role;
        const branch_id = req.user.branch_id;
        const whereCondition = { status: 'Active' };
        const travelWhereCondition = {};
        const {
            first_name, mobile, email, age, address, assigned_to, leader, lead_status, status_id,

            travel_type, ticket_type, package_id, travel_with_in, travel_from_date, travel_to_date, departure_time,
            arrival_time, lead_itinerary_id, primary_reference_id, reference_id, start_date, end_date } = searchParams;

        if (first_name) whereCondition.first_name = { [Op.like]: `%${first_name}%` };
        if (mobile) whereCondition.mobile = { [Op.like]: `%${mobile}%` };
        if (email) whereCondition.email = { [Op.like]: `%${email}%` };
        if (age) whereCondition.age = age;
        if (address) whereCondition.address = { [Op.like]: `%${address}%` };
        if (lead_status) whereCondition.lead_status = lead_status;

        if (assigned_to) travelWhereCondition.assigned_to = assigned_to;
        if (leader) travelWhereCondition.leader = leader;
        if (status_id) travelWhereCondition.status_id = status_id;
        if (travel_type) travelWhereCondition.travel_type = travel_type;
        if (ticket_type) travelWhereCondition.ticket_type = ticket_type;
        if (package_id) travelWhereCondition.package_id = package_id;
        if (travel_with_in) travelWhereCondition.travel_with_in = travel_with_in;
        if (lead_itinerary_id) travelWhereCondition.lead_itinerary_id = lead_itinerary_id;
        if (primary_reference_id) travelWhereCondition.primary_reference_id = primary_reference_id;
        if (reference_id) travelWhereCondition.reference_id = reference_id;
        if (departure_time) travelWhereCondition.departure_time = departure_time;
        if (arrival_time) travelWhereCondition.arrival_time = arrival_time;

        if (start_date && end_date) {
            travelWhereCondition.travel_from_date = {
                [Op.gte]: start_date,
                [Op.lte]: end_date
            };
        }
        // if (travel_from_date && travel_from_date.start && travel_from_date.end) {
        //     travelWhereCondition.travel_from_date = {
        //         [Op.gte]: travel_from_date.start,
        //         [Op.lte]: `${travel_from_date.end}T23:59:59.999Z`
        //     };
        // }
        let includeOption = [
            { model: Members, required: false },
            {
                model: LeadsDestinations, attributes: ['id', 'destination_id'],
                include: [{ model: Country, as: 'destinationId', required: false }],
                required: false
            },
            {
                model: LeadsFollowUp,
                where: { lead_status: { [Op.ne]: null } }, order: [['createdAt', 'DESC']], limit: 1,
                required: false,
            }
        ];

        if (current_role) {
            if (current_role === 'ADMIN' || current_role === 'MD') {
            } else if (current_role === 'BH') {
                const branchUsers = await User.findAll({
                    attributes: ['id'],
                    where: { branch_id: branch_id }
                });
                const branchUserIds = branchUsers.map(user => user.id);
                travelWhereCondition.assigned_to = { [Op.in]: branchUserIds };
            } else {
                travelWhereCondition.assigned_to = user;
            }
        }

        if (Object.keys(travelWhereCondition).length > 0) {
            includeOption.push({
                model: TravelDetails,
                required: true,
                where: travelWhereCondition,
                include: [
                    { model: TravelType, as: 'travelId', attributes: ['id', 'name'], required: false },
                    { model: User, as: 'assignedTo', attributes: ['id', 'username', 'name'], required: assigned_to ? true : false },
                    { model: ProspectStatus, as: 'statusId', attributes: ['id', 'name', 'label'] },
                    { model: TourPackages, as: 'packageId', attributes: ['id', 'name', 'place', 'adult_amount', 'child_amount', 'infants_amount'] },
                    { model: LeadItineraryPlan, as: 'itineraryId', attributes: ['id', 'name', 'label'], required: false },
                    { model: PackageSchedule, as: 'packageScheduleId', attributes: ['id', 'name', 'start_date', 'end_date'], required: false },
                    // { model: Modeofcontact, as: 'primaryReferenceId', attributes: ['id', 'name', 'label'], required: false },
                    { model: Reference, as: 'referenceId', attributes: ['id', 'name', 'label'], required: false },
                    { model: TravelHub, as: 'travelHubId', attributes: ['id', 'name', 'label'], required: false }
                ],
            });
        } else {
            includeOption.push({
                model: TravelDetails,
                include: [
                    { model: TravelType, as: 'travelId', attributes: ['id', 'name'], required: false },
                    { model: User, as: 'assignedTo', attributes: ['id', 'username', 'name'], required: assigned_to ? true : false },
                    { model: ProspectStatus, as: 'statusId', attributes: ['id', 'name', 'label'], where: { label: { [Op.eq]: 'completed' } }, },
                    { model: TourPackages, as: 'packageId', attributes: ['id', 'name', 'place', 'adult_amount', 'child_amount', 'infants_amount'] },
                    { model: LeadItineraryPlan, as: 'itineraryId', attributes: ['id', 'name', 'label'], required: false },
                    { model: PackageSchedule, as: 'packageScheduleId', attributes: ['id', 'name', 'start_date', 'end_date'], required: false },
                    { model: Modeofcontact, as: 'primaryReferenceId', attributes: ['id', 'name', 'label'], required: false },
                    { model: Reference, as: 'referenceId', attributes: ['id', 'name', 'label'], required: false },
                    { model: TravelHub, as: 'travelHubId', attributes: ['id', 'name', 'label'], required: false }
                ],
            });
        }

        Searchattributes = {
            ...Searchattributes,
            order: [['id', 'DESC']],
            where: whereCondition,
            include: includeOption,
            distinct: true
        };
        // const leads = await Leads.findAndCountAll(Searchattributes);
        const leads = await Leads.findAndCountAll({
            where: { ...whereCondition, '$travelDetails.statusId.label$': 'completed' },
            order: [['id', 'DESC']],
            // where: whereCondition,
            include: includeOption,
            distinct: true
        });

        if (!leads.rows || leads.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'No Leads found..!' });
        }
        const response = getPagingData(leads, page, limit);
        res.status(200).json({ success: true, data: response, message: 'Leads fetched Successfully..!' });
    } catch (error) {
        console.error("Error in leadsList:", error);
        res.status(500).json({ success: false, message: error.message || 'Error fetching Leads list..!' });
    }
};

exports.getPendingFollowUps = async (req, res) => {
    const user = req.user.id;
    const page = req.query.page || 0;
    const size = req.query.size || 10;
    const user_roles = req.user_roles;
    const current_role = req.user.current_role;
    try {
        const todayStart = moment().startOf("day").toDate();
        const { limit, offset } = getPagination(page, size);

        let whereCondition = {
            status: "Active",

        };

        if (current_role === 'ADMIN' || current_role === 'MD') {
            // Show all users’ follow-ups
            whereCondition.assigned_to = { [Op.ne]: null };
        } else {
            // Show only current user’s follow-ups
            whereCondition.assigned_to = user;
        }
        const pendingFollowups = await TravelDetails.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: User, as: 'assignedTo', attributes: ['id', 'username', 'name'],
                    include: [{ model: Branch, as: 'branchId', attributes: ['id', 'name', 'location'], }]
                },
                {
                    model: LeadsFollowUp,
                    where: {
                        followUp_status: 'Pending',
                        date: { [Op.lt]: todayStart },
                        lead_status: { [Op.ne]: null },
                        type: 'FOLLOW_UP',
                    },
                    required: true
                },
                {
                    model: LeadsFollowUp,
                    as: 'latestFollowUp',
                    where: {
                        lead_status: { [Op.ne]: null }
                    },
                    separate: true,
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                    type: 'FOLLOW_UP',
                    required: false
                },
                {
                    model: Leads,
                    as: "leadId",
                    required: true,
                    include: [
                        { model: Members, required: false, where: { status: { [Op.ne]: 'Inactive', } } },

                    ]
                },
                { model: TravelType, as: 'travelId', attributes: ['id', 'name'], required: false },
                {
                    model: ProspectStatus,
                    as: "statusId",
                    where: {
                        id: { [Op.notIn]: [7, 9] }
                    }

                }
            ],
            limit: limit,
            offset: offset,
            distinct: true,
            order: [
                [{ model: LeadsFollowUp }, 'date', 'ASC'],
                ['id', 'DESC']
            ]
        });

        // If no records found or count is 0, return the "no data" message
        if (!pendingFollowups || pendingFollowups.count === 0) {
            return res.status(200).json({
                success: true,
                message: "No pending follow-ups from previous dates",
                data: getPagingData({ count: 0, rows: [] }, page, limit)
            });
        }
        // Format the response with pagination data
        const paginatedResponse = getPagingData(pendingFollowups, page, limit);
        paginatedResponse.items = paginatedResponse.items.map(item => {
            const itemData = item.toJSON();

            if (itemData.leadId) {
                itemData.leadId.leadsFollowUps = itemData.leadsFollowUps || [];
                itemData.leadId.latestFollowUp = itemData.latestFollowUp || [];
            }
            delete itemData.leadsFollowUps;
            delete itemData.latestFollowUp;

            return itemData;
        })

        res.status(200).json({ success: true, data: paginatedResponse });
    } catch (error) {
        console.error("Error fetching past pending leads follow-ups:", error);
        res.status(500).json({ success: false, message: error || "Error fetching past pending leads follow-ups!" });
    }
};


exports.notInterestedLeadsList = async (req, res) => {
    try {
        const { current_role, branch_id } = req.user;

        const {
            first_name, mobile, email, age, address, assigned_to, leader,
            travel_type, ticket_type, package_id, travel_with_in, travel_from_date, travel_to_date,
            departure_time, arrival_time, lead_itinerary_id, primary_reference_id, reference_id,
            start_date, end_date, page, size, destination_id, created_from_date, created_to_date
        } = req.body;

        const { limit, offset } = getPagination(page, size);
        let Searchattributes = { limit, offset };

        // Filters on Leads
        const nameFilter = first_name ? { first_name: { [Op.like]: `%${first_name}%` } } : {};
        const mobileFilter = mobile
            ? {
                [Op.or]: [
                    { mobile: { [Op.like]: `%${mobile}%` } },
                    { wapp_number: { [Op.like]: `%${mobile}%` } },
                ],
            }
            : {};
        const emailFilter = email ? { email: { [Op.like]: `%${email}%` } } : {};
        const ageFilter = age ? { age: { [Op.like]: `%${age}%` } } : {};
        const addressFilter = address ? { address: { [Op.like]: `%${address}%` } } : {};

        const createdAtFilter = created_from_date && created_to_date
            ? {
                createdAt: {
                    [Op.gte]: created_from_date,
                    [Op.lte]: new Date(new Date(created_to_date).setHours(23, 59, 59, 999))
                }
            }
            : {};

        const destinationFilter = destination_id ? { destination_id } : {};

        // Assigned to logic
        let usersId = [];
        if (current_role === "BH") {
            const users = await User.findAll({ where: { [Op.and]: [{ status: 'Active' }, { branch_id }] } });
            usersId = users.map(user => user.id);
        }

        const assignToFilter = assigned_to ? { assigned_to } :
            (current_role === "MD" || current_role === "ADMIN") ? {} :
                current_role === "BH" ? { assigned_to: { [Op.in]: usersId } } :
                    { assigned_to: req.user.id };

        // Other travel filters
        const leaderFilter = leader ? { leader } : {};
        const travelTypeFilter = travel_type ? { travel_type } : {};
        const ticketTypeFilter = ticket_type ? { ticket_type } : {};
        const packageIdFilter = package_id ? { package_id } : {};
        const leadItineraryFilter = lead_itinerary_id ? { lead_itinerary_id } : {};
        const primaryReferenceFilter = primary_reference_id ? { primary_reference_id } : {};
        const referenceFilter = reference_id ? { reference_id } : {};
        const departureFilter = departure_time ? { departure_time } : {};
        const arrivalFilter = arrival_time ? { arrival_time } : {};

        const travelDateFilter = start_date && end_date
            ? { travel_from_date: { [Op.gte]: start_date, [Op.lte]: end_date } }
            : {};

        Searchattributes = {
            ...Searchattributes,
            order: [['id', 'DESC']],
            distinct: true,
            where: {
                status_id: 9, // Not Interested
                ...assignToFilter,
                ...leaderFilter,
                ...travelTypeFilter,
                ...ticketTypeFilter,
                ...packageIdFilter,
                ...leadItineraryFilter,
                ...primaryReferenceFilter,
                ...referenceFilter,
                ...departureFilter,
                ...arrivalFilter,
                ...travelDateFilter
            },
            include: [
                {
                    model: Leads,
                    as: 'leadId',
                    where: {
                        ...nameFilter,
                        ...mobileFilter,
                        ...emailFilter,
                        ...ageFilter,
                        ...addressFilter,
                        ...createdAtFilter
                    },
                    include: [
                        {
                            model: Members,
                            required: false,
                            where: { status: { [Op.ne]: 'Inactive' } }
                        },
                        {
                            model: LeadsFollowUp,
                            where: { lead_status: { [Op.ne]: null } },
                            order: [['createdAt', 'DESC']],
                            limit: 1,
                            required: false,
                            include: [{ model: db.notIntrestedType, as: "notIntrested" }]
                        }
                    ]
                },
                {
                    model: LeadsDestinations,
                    attributes: ['id', 'destination_id'],
                    include: [{
                        model: Country,
                        as: 'destinationId',
                        required: false
                    }],
                    where: destinationFilter,
                    required: destination_id ? true : false
                },
                {
                    model: TravelType,
                    as: 'travelId',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'assignedTo',
                    attributes: ['id', 'username', 'name'],
                    include: [{
                        model: Branch,
                        as: 'branchId',
                        attributes: ['id', 'name', 'location']
                    }]
                },
                {
                    model: ProspectStatus,
                    as: 'statusId',
                    attributes: ['id', 'name', 'label']
                },
                {
                    model: TourPackages,
                    as: 'packageId',
                    attributes: ['id', 'name', 'place', 'adult_amount', 'child_amount', 'infants_amount']
                },
                {
                    model: LeadItineraryPlan,
                    as: 'itineraryId',
                    attributes: ['id', 'name', 'label']
                },
                {
                    model: PackageSchedule,
                    as: 'packageScheduleId',
                    attributes: ['id', 'name', 'start_date', 'end_date']
                },
                {
                    model: Modeofcontact,
                    as: 'primaryReferenceId',
                    attributes: ['id', 'name', 'label']
                },
                {
                    model: Reference,
                    as: 'referenceId',
                    attributes: ['id', 'name', 'label']
                },
                {
                    model: TravelHub,
                    as: 'travelHubId',
                    attributes: ['id', 'name', 'label'],
                    required: false
                }
            ]
        };

        const travelDetails = await TravelDetails.findAndCountAll(Searchattributes);
        const transformedRows = travelDetails.rows.map(item => {
            const travel = item.toJSON();
            const lead = travel.leadId || {};
            const leadDestinations = travel.leadDestinations || {};

            // Remove travel.leadId to avoid duplication
            delete travel.leadId;
            delete travel.leadDestinations;

            // Return the lead as the main object and embed travel data inside
            return {
                ...lead,
                leadDestinations: leadDestinations,
                travelDetails: [travel]
            };
        });
        const finalResponse = {
            count: travelDetails.count,
            rows: transformedRows
        };
        const response = getPagingData(finalResponse, page, limit);
        res.status(200).json({
            success: true,
            leads: response
        });

    } catch (error) {
        console.error('Not Interested Travel Details fetch error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error in fetching Not Interested travel details'
        });
    }
};
