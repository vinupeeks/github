import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, BookOpen, BadgeInfo } from 'lucide-react';
import { Loading } from '@nextui-org/react';
import toast from 'react-hot-toast';

const CourseSuggestions = ({ qualification, areasOfInterest, onSelectCourse, onSuggestionsFetched, selectedVisaDetails }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const fetchCourseSuggestions = async () => {
        if (!qualification) {
            toast.error('Please select qualification and proceed..!');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "https://njs.solminds.com/GeebeeCourses/suggest-courses-from-file",
                // "http://localhost:3001/suggest-courses-from-file",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        qualification,
                        interestingArea: areasOfInterest,
                        countryid: selectedVisaDetails?.country_id
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Server response was not OK");
            }

            const data = await response.json();
            
            // const data = {
            //     "qualification": "Plus two computer science",
            //     "interestingArea": "Software engineer",
            //     "suggested_courses": [
            //         {
            //             "course_name": "Bachelor of Software Engineering (Honours)",
            //             "college": "Deakin University",
            //             "country": "Australia",
            //             "countryid": 3,
            //             "course_reason": "This degree directly aligns with your career goal of becoming a software engineer, providing in-depth knowledge and practical skills in software design, development, and maintenance.",
            //             "college_reason": "Universities offering this specialization often have strong industry links and hands-on projects, crucial for a software engineering career."
            //         },
            //         {
            //             "course_name": "Bachelor of Computer Science",
            //             "college": "Edith Cowan University",
            //             "country": "Australia",
            //             "countryid": 3,
            //             "course_reason": "A fundamental and versatile degree that provides a strong foundation in computing principles, algorithms, and programming, essential for any software engineering path.",
            //             "college_reason": "Many institutions have well-established Computer Science departments with experienced faculty and resources that foster innovation in software."
            //         },
            //         {
            //             "course_name": "Bachelor of Information Technology (Software Development) - (Awarded by Federation University)",
            //             "college": "Australian Technical and Management College (ATMC)",
            //             "country": "Australia",
            //             "countryid": 3,
            //             "course_reason": "This course focuses on the practical application of IT skills in software creation, directly preparing you for roles in developing various software solutions.",
            //             "college_reason": "Federation University offers applied IT programs that are often industry-focused, ensuring graduates are job-ready with practical development skills."
            //         },
            //         {
            //             "course_name": "Bachelor of Artificial Intelligence (Honours)",
            //             "college": "Deakin University",
            //             "country": "Australia",
            //             "countryid": 3,
            //             "course_reason": "With AI becoming integral to many applications, this specialization equips you with highly sought-after skills in developing intelligent software systems.",
            //             "college_reason": "Institutions offering AI Honours programs typically provide advanced research opportunities and access to cutting-edge tools and labs."
            //         },
            //         {
            //             "course_name": "Bachelor of Cyber Security",
            //             "college": "Deakin University",
            //             "country": "Australia",
            //             "countryid": 3,
            //             "course_reason": "As software security is paramount, this degree offers a crucial specialization for building secure and robust software, a high-demand area for software engineers.",
            //             "college_reason": "Universities with Cyber Security programs often have dedicated labs and foster expertise in protecting digital assets, vital for secure software development."
            //         }
            //     ]
            // }

            if (data?.suggested_courses) {
                const courses = [...data.suggested_courses];

                // Pick 2 random unique indexes
                const randomIndexes = new Set();
                while (randomIndexes.size < 2) {
                    randomIndexes.add(Math.floor(Math.random() * courses.length));
                }

                // Mark visa approved without changing order
                const updatedCourses = courses.map((course, index) => ({
                    ...course,
                    visa_approved: randomIndexes.has(index)
                }));

                setSuggestions(updatedCourses);
                // setSuggestions(data.suggested_courses);
                setShowSuggestions(true);
                if (onSuggestionsFetched) {
                    onSuggestionsFetched(updatedCourses);
                    // onSuggestionsFetched(data.suggested_courses);
                }
            } else {
                toast.info("No course suggestions available");
            }

        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Failed to fetch course suggestions");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCourse = (course) => {
        if (onSelectCourse) {
            onSelectCourse(course);
        }
        setShowSuggestions(false);
    };

    return (
        <div className="mt-2">
            {/* Generate Button */}
            {selectedVisaDetails?.country_id && (
                <div className="mt-2 flex justify-center">
                    <button
                        type="button"
                        onClick={fetchCourseSuggestions}
                        disabled={loading || !qualification}
                        className={`flex items-center justify-center gap-2 
                            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[200px] w-auto
                            ${loading || !qualification
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-purple-600 text-white hover:bg-purple-700"
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loading size="xs" color="white" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                Get Course Suggestions
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Suggestions Modal */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">

                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                                    <BookOpen size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Recommended Courses - <span className="text-lg font-semibold text-purple-700"> {suggestions[0]?.country} </span>
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Based on your profile
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSuggestions(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Profile Summary */}
                        <div className="px-6 py-4 bg-gray-100 border-b">
                            <div className="grid grid-cols-2 gap-6 text-sm">

                                {/* Qualification */}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                                        Qualification
                                    </p>
                                    <p className="mt-1 font-semibold text-gray-800">
                                        {qualification}
                                    </p>
                                </div>

                                {/* Areas of Interest */}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                                        Areas of Interest
                                    </p>
                                    <p className="mt-1 font-semibold text-gray-800">
                                        {areasOfInterest || 'N/A'}
                                    </p>
                                </div>

                            </div>
                        </div>

                        {/* Course List */}
                        <div className="max-h-[350px] overflow-y-auto px-4 py-3 space-y-2">
                            {suggestions.map((course, index) => {
                                const showBelow = index < 2;
                                return (
                                    <div
                                        key={index}
                                        className={`group relative p-4 rounded-xl transition flex items-center justify-between gap-4
                                                ${course?.visa_approved
                                                ? "border-2 border-green-400 bg-green-50 hover:border-green-500 hover:bg-green-100 hover:shadow shadow-sm"
                                                : "border border-gray-200 bg-white hover:border-purple-300 hover:shadow-md"
                                            }`}
                                    >
                                        {/* Left Side: Course Info */}
                                        <div className="flex flex-col gap-1 overflow-hidden">
                                            <span className="text-sm font-semibold text-gray-800 group-hover:text-purple-700 truncate">
                                                {course?.course_name}
                                            </span>
                                            <span
                                                className={`text-xs truncate ${course?.college ? "text-gray-500" : "text-red-500 font-medium"
                                                    }`}
                                            >
                                                {course?.college || "University not specified"}
                                            </span>
                                        </div>

                                        {/* Right Side: Icon & Tooltip */}
                                        {/* <div className="relative flex-shrink-0 group/tooltip">
                                            <BadgeInfo
                                                size={20}
                                                className="cursor-pointer text-purple-400 hover:text-purple-600 transition-colors"
                                            />

                                            <div className={`
                                                    absolute right-0 z-50 w-64 p-3 rounded-lg shadow-xl
                                                    bg-gray-900 text-white text-xs leading-relaxed
                                                    opacity-0 group-hover/tooltip:opacity-100
                                                    pointer-events-auto transition-all duration-200
                                                    max-h-50 overflow-y-auto
                                                    ${showBelow
                                                        ? "top-full mt-2 translate-y-[-4px] group-hover/tooltip:translate-y-0"
                                                        : "bottom-full mb-2 translate-y-1 group-hover/tooltip:translate-y-0"}
                                                    `}>
                                                <p className="font-medium mb-1 text-purple-300">Why this course?</p>
                                                {course?.course_reason || 'n/a'}

                                                <p className="font-medium mb-1 text-purple-300">Why this college?</p>
                                                {course?.college_reason || 'n/a'}

                                                <div className={`absolute right-2 border-8 border-transparent 
                                                    ${showBelow
                                                        ? "bottom-full -mb-1 border-b-gray-900"
                                                        : "top-full -mt-1 border-t-gray-900"}
                                                    `} />
                                            </div>
                                        </div> */}

                                        <div className="relative flex items-center gap-2 flex-shrink-0">

                                            {course?.visa_approved && (
                                                <span className="items-center px-2 py-0.5 text-[10px] font-semibold 
                                                bg-green-100 text-green-700 
                                                rounded-full border border-green-200">
                                                    Visa Approved
                                                </span>
                                            )}

                                            {/* Trigger: only the icon triggers the tooltip */}
                                            <div className="group/tooltip inline-block">
                                                <BadgeInfo
                                                    size={20}
                                                    className="cursor-pointer text-purple-400 hover:text-purple-600 transition-colors"
                                                />                                      

                                                {/* Tooltip */}
                                                <div className={`
                                                    absolute right-0 z-50 w-64 p-3 rounded-lg shadow-xl
                                                    bg-gray-900 text-white text-xs leading-relaxed
                                                    opacity-0 group-hover/tooltip:opacity-100
                                                    pointer-events-none group-hover/tooltip:pointer-events-auto
                                                    transition-all duration-200
                                                    max-h-50 overflow-y-auto
                                                    ${showBelow
                                                        ? "top-full mt-2"
                                                        : "bottom-full mb-2"}
                                                `}>
                                                    <p className="font-medium mb-1 text-purple-300">Why this course?</p>
                                                    {course?.course_reason || 'n/a'}                                        

                                                    <p className="font-medium mb-1 text-purple-300">Why this college?</p>
                                                    {course?.college_reason || 'n/a'}                                       

                                                    {/* Tooltip Arrow */}
                                                    <div className={`absolute right-2 border-8 border-transparent 
                                                        ${showBelow
                                                            ? "bottom-full -mb-1 border-b-gray-900"
                                                            : "top-full -mt-1 border-t-gray-900"}
                                                    `} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={() => setShowSuggestions(false)}
                                className="px-4 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default CourseSuggestions;