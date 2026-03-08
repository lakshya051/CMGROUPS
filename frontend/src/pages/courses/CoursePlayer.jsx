import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { PlayCircle, CheckCircle, ArrowLeft, Lock, FileText, Download } from 'lucide-react';
import { coursesAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const CoursePlayer = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [courseData, setCourseData] = useState(null);
    const [activeMaterialId, setActiveMaterialId] = useState(null);

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                const data = await coursesAPI.getCoursePlayer(id);
                setCourseData(data);
                if (data.course.materials?.length > 0) {
                    setActiveMaterialId(data.course.materials[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch player data:', error);
                toast.error(error.message || 'Failed to load course player');
            } finally {
                setLoading(false);
            }
        };

        fetchCourseData();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-text-muted">Loading course player...</div>;

    if (!courseData || !courseData.course) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Course Not Found</h2>
                <Link to="/dashboard/courses"><Button>Back to My Courses</Button></Link>
            </div>
        );
    }

    const { course, enrollment } = courseData;
    const materials = course.materials || [];
    const activeMaterial = materials.find(m => m.id === activeMaterialId);

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-64px)] flex flex-col animate-in fade-in">
            <Link to="/dashboard/courses" className="inline-flex items-center gap-2 text-text-muted hover:text-primary mb-6 transition-colors">
                <ArrowLeft size={18} /> Back to My Learning
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                {/* Main Content Area */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {activeMaterial ? (
                        <>
                            {activeMaterial.fileType === 'Video' ? (
                                <div className="aspect-video bg-black rounded-lg justify-center flex items-center relative overflow-hidden group shadow-sm">
                                    {/* Usually an iframe or video tag goes here */}
                                    <video src={activeMaterial.fileUrl} controls className="w-full h-full object-cover">
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ) : (
                                <div className="aspect-video bg-surface rounded-lg border border-border-default flex flex-col items-center justify-center p-lg text-center shadow-sm">
                                    <FileText size={48} className="text-trust mb-sm" />
                                    <h3 className="text-xl font-bold mb-xs text-text-primary">{activeMaterial.title}</h3>
                                    <p className="text-sm text-text-secondary mb-md">{activeMaterial.description || 'View document contents attached to this material.'}</p>
                                    <a href={activeMaterial.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline"><Download size={18} className="mr-xs" /> Download / View Document</Button>
                                    </a>
                                </div>
                            )}

                            <div>
                                <h1 className="text-2xl font-bold mb-2">{activeMaterial.title}</h1>
                                {activeMaterial.description && (
                                    <p className="text-text-muted">{activeMaterial.description}</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="aspect-video bg-surface rounded-lg border border-border-default flex flex-col items-center justify-center shadow-sm">
                            <h3 className="text-xl font-bold mb-xs text-text-primary">No Materials Available</h3>
                            <p className="text-sm text-text-secondary">The instructor hasn't uploaded any materials yet.</p>
                        </div>
                    )}
                </div>

                {/* Playlist Sidebar */}
                <div className="glass-panel overflow-y-auto max-h-[600px] flex flex-col bg-surface border border-border-default rounded-lg shadow-sm">
                    <div className="p-sm border-b border-border-default sticky top-0 bg-surface/90 backdrop-blur z-10">
                        <h2 className="font-bold text-base mb-1 text-text-primary">{course.title}</h2>
                        <div className="flex justify-between items-center text-xs text-text-secondary">
                            <span>{materials.length} Materials</span>
                            <span>Progress: {enrollment.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-border-default mt-xs rounded-full overflow-hidden">
                            <div className="h-full bg-success transition-all duration-500" style={{ width: `${enrollment.progress}%` }}></div>
                        </div>
                    </div>

                    <ul className="divide-y divide-border-default flex-grow">
                        {materials.length === 0 ? (
                            <li className="p-sm text-center text-sm text-text-secondary">Empty content</li>
                        ) : (
                            materials.map((material, index) => (
                                <li
                                    key={material.id}
                                    onClick={() => setActiveMaterialId(material.id)}
                                    className={`p-sm flex items-center gap-sm cursor-pointer hover:bg-surface-hover transition-colors ${activeMaterialId === material.id ? 'bg-surface-hover border-l-2 border-trust' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activeMaterialId === material.id ? 'bg-trust/10 text-trust' : 'bg-page-bg text-text-secondary'}`}>
                                        {material.fileType === 'Video' ? <PlayCircle size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="flex-grow">
                                        <p className={`text-sm font-medium ${activeMaterialId === material.id ? 'text-trust' : 'text-text-primary'}`}>
                                            {index + 1}. {material.title}
                                        </p>
                                        <p className="text-xs text-text-secondary mt-0.5">{material.fileType}</p>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CoursePlayer;
