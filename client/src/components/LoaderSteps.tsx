import { BrainCircuitIcon, CheckCircle2Icon, CodeIcon, LayoutIcon, PaintbrushIcon, RocketIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

const steps = [
    { icon: BrainCircuitIcon, label: 'Analyzing your prompt', detail: 'Understanding requirements & design intent' },
    { icon: PaintbrushIcon, label: 'Enhancing design specs', detail: 'Adding colors, typography & layout details' },
    { icon: LayoutIcon, label: 'Generating layout structure', detail: 'Building responsive sections & components' },
    { icon: CodeIcon, label: 'Writing production code', detail: 'Creating HTML, CSS & JavaScript' },
    { icon: RocketIcon, label: 'Finalizing your website', detail: 'Polishing animations & responsiveness' },
]

const ESTIMATED_TOTAL_MS = 100000;
const STEP_DURATION = ESTIMATED_TOTAL_MS / steps.length;

interface LoaderStepsProps {
    startTime?: number;
}

const LoaderSteps = ({ startTime }: LoaderStepsProps) => {
    const baseTime = startTime || Date.now();
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Calculate immediately on mount
        const elapsed = Date.now() - baseTime;
        setProgress(Math.min((elapsed / ESTIMATED_TOTAL_MS) * 100, 97));
        setCurrentStep(Math.min(Math.floor(elapsed / STEP_DURATION), steps.length - 1));

        const interval = setInterval(() => {
            const elapsed = Date.now() - baseTime;
            setProgress(Math.min((elapsed / ESTIMATED_TOTAL_MS) * 100, 97));
            setCurrentStep(Math.min(Math.floor(elapsed / STEP_DURATION), steps.length - 1));
        }, 300);
        return () => clearInterval(interval);
    }, [baseTime]);

    const getETA = () => {
        const elapsed = Date.now() - baseTime;
        const remaining = Math.max(ESTIMATED_TOTAL_MS - elapsed, 0);
        const secs = Math.ceil(remaining / 1000);
        if (secs <= 0) return 'Almost done...';
        if (secs < 60) return `~${secs}s remaining`;
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `~${mins}m ${remSecs}s remaining`;
    };

    return (
        <div className='w-full h-full flex flex-col items-center justify-center bg-gray-950 relative overflow-hidden text-white'>
            <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-purple-500/8 to-fuchsia-500/8 blur-3xl animate-pulse' />
            <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[100px]' />

            <div className='relative z-10 w-full max-w-md px-6'>
                <div className='text-center mb-8'>
                    <div className='text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent tabular-nums'>
                        {Math.round(progress)}%
                    </div>
                    <p className='text-gray-400 text-sm mt-2 tracking-wide'>{getETA()}</p>
                </div>

                <div className='w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-8 border border-gray-700/50'>
                    <div
                        className='h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 transition-all duration-500 ease-out relative'
                        style={{ width: `${progress}%` }}
                    >
                        <div className='absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse' />
                    </div>
                </div>

                <div className='space-y-3'>
                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        const isActive = i === currentStep;
                        const isCompleted = i < currentStep;

                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                                    isActive
                                        ? 'bg-indigo-500/10 border border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                                        : isCompleted
                                        ? 'bg-gray-800/30 border border-gray-700/30'
                                        : 'border border-transparent opacity-40'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${
                                    isActive
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : isCompleted
                                        ? 'bg-green-500/15 text-green-400'
                                        : 'bg-gray-800 text-gray-500'
                                }`}>
                                    {isCompleted ? (
                                        <CheckCircle2Icon className='w-4 h-4' />
                                    ) : (
                                        <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                                    )}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <p className={`text-sm font-medium transition-colors duration-500 ${
                                        isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        {step.label}
                                    </p>
                                    {isActive && (
                                        <p className='text-xs text-indigo-300/70 mt-0.5 truncate'>{step.detail}</p>
                                    )}
                                </div>
                                {isActive && (
                                    <div className='w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0' />
                                )}
                            </div>
                        );
                    })}
                </div>

                <p className='text-center text-xs text-gray-500 mt-6'>
                    AI is crafting your website • Please don't close this tab
                </p>
            </div>
        </div>
    )
}

export default LoaderSteps