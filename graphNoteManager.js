import React, { useEffect, useState } from "react";
import {
    useGetgraphNotesMutation,
    useCreategraphNotesMutation,
    useUpdategraphNotesMutation,
    useDeletegraphNotesMutation
} from "../../redux/services/graphNotesApi";

const GraphNotesManager = ({ graphName, displayName, className = "" }) => {
    const [getGraphNotes, { data: notesData, isLoading: notesLoading }] = useGetgraphNotesMutation();
    const [createGraphNote, { isLoading: creating }] = useCreategraphNotesMutation();
    const [updateGraphNote, { isLoading: updating }] = useUpdategraphNotesMutation();
    const [deleteGraphNote, { isLoading: deleting }] = useDeletegraphNotesMutation();

    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteContent, setNoteContent] = useState("");
    const [existingNote, setExistingNote] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    // Constants for note truncation
    const MAX_NOTE_LENGTH = 50;

    // Fetch notes for this graph
    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            await getGraphNotes({});
        } catch (err) {
            setError("Failed to fetch notes");
        }
    };

    // Find note for current graph
    useEffect(() => {
        if (notesData?.data && Array.isArray(notesData.data)) {
            const currentNote = notesData.data.find(note => note.name === graphName);
            setExistingNote(currentNote || null);
            setNoteContent(currentNote?.note || "");
        }
    }, [notesData, graphName]);

    const handleAddNote = () => {
        setShowNoteInput(true);
        setIsEditing(false);
        setError("");
    };

    const handleEditNote = () => {
        setShowNoteInput(true);
        setIsEditing(true);
        setError("");
        setNoteContent(existingNote?.note || "");
    };

    const handleSaveNote = async () => {
        if (!noteContent.trim()) {
            setError("Note content is required");
            return;
        }

        try {
            setError("");

            if (existingNote) {
                // Update existing note
                await updateGraphNote({
                    id: existingNote.id,
                    name: graphName,
                    note: noteContent.trim()
                }).unwrap();
            } else {
                // Create new note
                await createGraphNote({
                    name: graphName,
                    note: noteContent.trim()
                }).unwrap();
            }

            // Refresh notes
            await fetchNotes();
            setShowNoteInput(false);
            setNoteContent("");
            setIsExpanded(false);
        } catch (error) {
            console.error("Error saving note:", error);
            setError(error?.data?.message || "Failed to save note");
        }
    };

    const handleCancel = () => {
        setShowNoteInput(false);
        setNoteContent(existingNote?.note || "");
        setError("");
    };

    const handleDeleteNote = async () => {
        if (!existingNote) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete the note for "${displayName}"?\n\nThis action cannot be undone.`
        );

        if (confirmed) {
            try {
                setError("");

                // Delete the note using DELETE mutation
                await deleteGraphNote({
                    id: existingNote.id,
                }).unwrap();

                await fetchNotes();
                setShowNoteInput(false);
                setNoteContent("");
                setIsExpanded(false);
            } catch (error) {
                console.error("Error deleting note:", error);
                setError(error?.data?.message || "Failed to delete note");
            }
        }
    };

    const handleTextareaChange = (e) => {
        setNoteContent(e.target.value);
        if (error) setError(""); // Clear error when user starts typing
    };

    
    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Helper function to truncate note
    const getTruncatedNote = (note) => {
        if (!note) return "";
        if (note.length <= MAX_NOTE_LENGTH || isExpanded) {
            return note;
        }
        return note.substring(0, MAX_NOTE_LENGTH) + "...";
    };

    // Check if note needs truncation
    const needsTruncation = existingNote?.note && existingNote.note.length > MAX_NOTE_LENGTH;

    const isLoading = creating || updating || deleting || notesLoading;

    return (
        <div className={`mt-2 border-t border-gray-300 pt-2 ${className}`}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    {/* Display existing note */}
                    {existingNote && !showNoteInput && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-r-xl p-2 mb-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-base font-semibold text-blue-900 leading-tight">
                                            Note
                                        </h4>
                                    </div>

                                    <div className="mb-4">
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-white/50 shadow-sm">
                                            {getTruncatedNote(existingNote.note)}
                                        </div>

                                        {needsTruncation && (
                                            <button
                                                onClick={toggleExpanded}
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline transition-colors duration-150"
                                            >
                                                {isExpanded ? "Show less" : "Read more"}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-blue-600/80">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>
                                            Last updated: {new Date(existingNote.updatedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <button
                                        onClick={handleEditNote}
                                        disabled={isLoading}
                                        className="group px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200 hover:border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-150 flex items-center gap-2"
                                    >
                                        <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        {/* Edit */}
                                    </button>
                                    <button
                                        onClick={handleDeleteNote}
                                        disabled={isLoading}
                                        className="group px-4 py-2 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 hover:border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-150 flex items-center gap-2"
                                    >
                                        <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        {/* Delete */}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Note input form */}
                    {showNoteInput && (
                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 mb-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-gray-800">
                                    {isEditing ? "Edit Note" : "Add Note"} for "{displayName}"
                                </h4>
                            </div>

                            <div className="space-y-4">
                                <textarea
                                    value={noteContent}
                                    onChange={handleTextareaChange}
                                    placeholder="Enter your note here..."
                                    //  You can add observations, insights, trends, or any relevant information about this chart.
                                    disabled={isLoading}
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[50px] resize-vertical disabled:bg-gray-100 disabled:cursor-not-allowed text-sm leading-relaxed shadow-inner transition-all duration-200"
                                    rows="2"
                                />

                                {/* <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Characters: {noteContent.length}
                                </div> */}

                                {error && (
                                    <div className="text-red-700 text-sm p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-fade-in">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleSaveNote}
                                        disabled={!noteContent.trim() || isLoading}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        {isLoading && (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        {isEditing ? "Update Note" : "Save Note"}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={isLoading}
                                        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Note button */}
                {!showNoteInput && !existingNote && (
                    <div className="flex-shrink-0">
                        <button
                            onClick={handleAddNote}
                            disabled={isLoading}
                            className="group px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium whitespace-nowrap disabled:opacity-50 flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                            {isLoading && (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Note</span>
                        </button>
                    </div>
                )}
            </div>
            <div className={`mt-2 border-t border-gray-300 pt-2 ${className}`}></div>

            {/* Global error display */}
            {error && !showNoteInput && (
                <div className="text-red-700 text-sm mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-fade-in">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
};

export default GraphNotesManager;

