import React, { useEffect, useRef, useState } from 'react'
import type { Message, Project, Version } from '../types'
import { BotIcon, EyeIcon, Loader2Icon, SendIcon, UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/config/axios';
import { toast } from 'sonner';

interface SidebarProps {
    isMenuOpen: boolean;
    project: Project;
    setProject: (project: Project) => void;
    isGenerating: boolean;
    setIsGenerating: (isGenerating: boolean) => void;
    generationStartTime?: number;
}

const Sidebar = ({ isMenuOpen, project, setProject, isGenerating, setIsGenerating, generationStartTime }: SidebarProps) => {

    const messageeRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/api/user/project/${project.id}`)
            setProject(data.project);
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
            console.log(error);
        }
    };

    const handleRollback = async (versionId: string) => {
        try {
            const confirm = window.confirm('Are you sure you want to rollback to this version?');
            if (!confirm) {
                return;
            }
            const { data } = await api.get(`/api/project/rollback/${project.id}/${versionId}`);
            const { data: data2 } = await api.get(`/api/user/project/${project.id}`)
            setProject(data2.project);
            toast.success(data.message);
            setIsGenerating(false);
        } catch (error: any) {
            setIsGenerating(false);
            toast.error(error.response?.data?.message || error.message);
            console.log(error);
        }
    }

    const handleRevision = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const currentInput = input;
        setInput('');
        setIsGenerating(true);
        let interval: number | undefined;
        try {
            interval = setInterval(() => {
                fetchProject();
            }, 10000)
            await api.post(`/api/project/revision/${project.id}`,
                { message: currentInput })
            fetchProject();
            toast.success("Project updated")
            clearInterval(interval)
            setIsGenerating(false);
        }
        catch (error: any) {
            setIsGenerating(false);
            clearInterval(interval);
            toast.error(error.response?.data?.message || error.message);
            console.log(error);
        }
    }

    useEffect(() => {
        if (messageeRef.current) {
            messageeRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [project.conversation.length, isGenerating]);

    return (
        <div className={`h-full sm:max-w-sm rounded-xl bg-gray-900 border-gray-800 transition-all ${isMenuOpen ? 'max-sm:w-0 overflow-hidden' : 'w-full'}`}>
            <div className="flex flex-col h-full">
                {/* Message container */}
                <div className='flex-1 overflow-y-auto no-scrollbar px-3 flex flex-col gap-4'>
                    {[...project.conversation, ...project.versions]
                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        .map((message) => {
                            const isMessage = 'content' in message;
                            if (isMessage) {
                                const msg = message as Message;
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={msg.id} className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        {!isUser && (
                                            <div className='w-8 h-8 rounded-full bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center'>
                                                <BotIcon className='size-5 txt-white' />
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] rounded-2xl p-2 px-4 shadow-sm text-sm mt-5 leading-relaxed ${isUser ? 'bg-linear-to-r from-indigo-500 to-indigo-600 text-white rounded-tr-none' : 'text-gray-100 rounded-tl-none bg-gray-800'}`}>
                                            {msg.content}
                                        </div>
                                        {isUser && (
                                            <div className='w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center'>
                                                <UserIcon className='size-5 txt-white' />
                                            </div>
                                        )}
                                    </div>
                                )
                            }
                            else {
                                const ver = message as Version;
                                return (
                                    <div key={ver.id} className='w-4/5 mx-auto my-2 p-3 rounded-xl bg-gray-800 text-gray-100 shadow flex flex-col gap-2'>
                                        <div className='text-xs font-medium'>
                                            code updated <br />
                                            <span className='text-xs text-gray-500 font-normal'>
                                                {new Date(ver.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            {project.current_version_index === ver.id ? (
                                                <button className='px-3 py-1 rounded-md text-xs bg-gray-700'>Current version</button>
                                            ) : (
                                                <button onClick={() => handleRollback(ver.id)} className='px-3 py-1 rounded-md text-xs bg-indigo-500 hover:bg-indigo-600 text-white'>Roll back to this version</button>
                                            )}
                                            <Link target='_blank' to={`/preview/${project.id}/${ver.id}`}>
                                                <EyeIcon className='size-6 p-1 bg-gray-700 hover:bg-indigo-500 transition-colors rounded' />
                                            </Link>
                                        </div>
                                    </div>
                                )
                            }
                        })
                    }
                    {/* Professional inline progress bar */}
                    {isGenerating && (
                        <GenerationProgress startTime={generationStartTime} />
                    )}
                    <div ref={messageeRef} />
                </div>
                {/* Input area */}
                <form onSubmit={handleRevision} className='m-3 relative'>
                    <div className='flex items-center gap-2'>
                        <textarea onChange={(e) => setInput(e.target.value)} value={input} rows={4} placeholder='Describe your website or request changes...' className='flex-1 p-3 rounded-xl resize-none text-sm outline-none ring ring-gray-700 focus:ring-indigo-500 bg-gray-800 text-gray-100 placeholder-gray-400 transition-all' disabled={isGenerating} />
                        <button disabled={isGenerating || !input.trim()} className='absolute bottom-2.5 right-2.5 rounded-full bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-colors text-white disabled:opacity-50 disabled:opacity-60'>
                            {isGenerating ? <Loader2Icon className='size-7 p-1.5 animate-spin text-white' /> :
                                <SendIcon className='size-7 p-1.5 text-white' />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const GENERATION_STEPS = [
    'Analyzing prompt...',
    'Enhancing design specs...',
    'Building layout...',
    'Writing code...',
    'Finalizing...',
];
const EST_TOTAL = 80000;

const GenerationProgress = ({ startTime: parentStartTime }: { startTime?: number }) => {
    const startTime = useRef(parentStartTime || Date.now()).current;
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setProgress(Math.min((elapsed / EST_TOTAL) * 100, 97));
        }, 300);
        return () => clearInterval(timer);
    }, [startTime]);

    const stepIndex = Math.min(Math.floor((progress / 100) * GENERATION_STEPS.length), GENERATION_STEPS.length - 1);
    const remaining = Math.max(Math.ceil((EST_TOTAL - (Date.now() - startTime)) / 1000), 0);
    const eta = remaining > 60 ? `~${Math.floor(remaining / 60)}m ${remaining % 60}s` : remaining > 0 ? `~${remaining}s` : 'Almost done';

    return (
        <div className='w-full my-2 p-3 rounded-xl bg-gray-800/80 border border-indigo-500/20 shadow-lg shadow-indigo-500/5'>
            <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>
                    <div className='w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center'>
                        <BotIcon className='size-3.5 text-white' />
                    </div>
                    <span className='text-xs font-medium text-indigo-300'>{GENERATION_STEPS[stepIndex]}</span>
                </div>
                <span className='text-xs font-bold text-white tabular-nums'>{Math.round(progress)}%</span>
            </div>
            <div className='w-full h-1.5 bg-gray-700 rounded-full overflow-hidden'>
                <div
                    className='h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 transition-all duration-500 ease-out'
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className='text-[10px] text-gray-500 mt-1.5 text-right'>{eta} remaining</p>
        </div>
    );
};

export default Sidebar