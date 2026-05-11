import { Loader2Icon } from 'lucide-react';
import React from 'react'
import api from '@/config/axios';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Home = () => {

    const { data: session } = authClient.useSession();
    const navigate = useNavigate();
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            if (!session?.user) {
                return toast.error("Please Sign in to create a project")
            } else if (!input.trim()) {
                return toast.error("Please enter a message")
            }
            setLoading(true)

            const { data } = await api.post('/api/user/project', { initial_prompt: input });
            setLoading(false);
            navigate(`/projects/${data.projectId}`);
        } catch (error: any) {
            setLoading(false);
            toast.error(error.response?.data?.message || error.message);
            console.log(error);
        }
    }

    return (

        <section className="flex flex-col items-center text-white text-sm pb-20 px-4">
            {/* BACKGROUND IMAGE */}

            <a href="/pricing" className="flex items-center gap-2 border border-slate-700 rounded-full p-1 pr-3 text-sm mt-20">
                <span className="bg-indigo-600 text-xs px-3 py-1 rounded-full">NEW</span>
                <p className="flex items-center gap-2">
                    <span>Try 30 days free trial option</span>
                    <svg className="mt-px" width="6" height="9" viewBox="0 0 6 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m1 1 4 3.5L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </p>
            </a>

            <h1 className="text-center text-[40px] leading-[48px] md:text-6xl md:leading-[70px] mt-4 font-semibold max-w-3xl">
                Turn thoughts into websites instantly, with AI.
            </h1>

            <p className="text-center text-base max-w-md mt-2">
                Create, customize and publish website faster than ever with our AI Website Builder.
            </p>

            <form onSubmit={onSubmitHandler} className="bg-white/10 max-w-2xl w-full rounded-xl p-4 mt-10 border border-indigo-600/70 focus-within:ring-2 ring-indigo-500 transition-all">
                <textarea onChange={e => setInput(e.target.value)} className="bg-transparent outline-none text-gray-300 resize-none w-full" rows={4} placeholder="Describe your website in details" required />
                <button className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-md px-4 py-2">
                    {!loading ? 'Create with AI' : (
                        <>
                            Creating <Loader2Icon className='animate-spin size-4 text-white' />
                        </>
                    )}
                </button>
            </form>

            {/* Trusted Logos */}
            <div className="flex flex-wrap items-center justify-center gap-10 md:gap-14 mx-auto mt-16">

                {/* Framer */}
                <div className="flex items-center gap-2 text-white/55 hover:text-white/90 transition-colors duration-300 cursor-default">
                    <svg className="h-5 w-auto shrink-0" viewBox="0 0 10 15" fill="currentColor">
                        <path d="M0 0h10v5H5L0 0zm0 5h5l5 5H0V5zm0 5h5v5z" />
                    </svg>
                    <span className="text-[15px] font-semibold tracking-tight">Framer</span>
                </div>

                {/* Huawei */}
                <div className="flex items-center gap-2 text-white/55 hover:text-white/90 transition-colors duration-300 cursor-default">
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <g transform="translate(12,12)">
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(0)" />
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(45)" />
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(90)" />
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(135)" />
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(180)" />
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(225)" />
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(270)" />
                            <ellipse cy="-5" rx="2.2" ry="5.8" transform="rotate(315)" />
                        </g>
                    </svg>
                    <span className="text-[13px] tracking-[0.2em] font-medium">HUAWEI</span>
                </div>

                {/* Instagram */}
                <span
                    className="text-white/55 hover:text-white/90 transition-colors duration-300 cursor-default text-[20px]"
                    style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}
                >
                    Instagram
                </span>

                {/* Microsoft */}
                <div className="flex items-center gap-2.5 text-white/55 hover:text-white/90 transition-colors duration-300 cursor-default">
                    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 21 21" fill="currentColor">
                        <rect width="9.5" height="9.5" />
                        <rect x="11.5" width="9.5" height="9.5" />
                        <rect y="11.5" width="9.5" height="9.5" />
                        <rect x="11.5" y="11.5" width="9.5" height="9.5" />
                    </svg>
                    <span className="text-[15px] font-light">Microsoft</span>
                </div>

                {/* Walmart */}
                <div className="flex items-center gap-2 text-white/55 hover:text-white/90 transition-colors duration-300 cursor-default">
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 100 100" fill="currentColor">
                        <g transform="translate(50,50)">
                            <path d="M0-32 C5-22 5-12 0-2 C-5-12-5-22 0-32" />
                            <path d="M0-32 C5-22 5-12 0-2 C-5-12-5-22 0-32" transform="rotate(60)" />
                            <path d="M0-32 C5-22 5-12 0-2 C-5-12-5-22 0-32" transform="rotate(120)" />
                            <path d="M0-32 C5-22 5-12 0-2 C-5-12-5-22 0-32" transform="rotate(180)" />
                            <path d="M0-32 C5-22 5-12 0-2 C-5-12-5-22 0-32" transform="rotate(240)" />
                            <path d="M0-32 C5-22 5-12 0-2 C-5-12-5-22 0-32" transform="rotate(300)" />
                        </g>
                    </svg>
                    <span className="text-[15px] font-bold">Walmart</span>
                    <span className="text-[11px] font-light -ml-1 mt-0.5">✦</span>
                </div>

            </div>
        </section>
    )
}

export default Home