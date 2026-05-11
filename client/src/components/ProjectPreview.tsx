import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from './LoaderSteps';

interface ProjectPreviewProps {
    project: Project;
    isGenerating: boolean;
    device?: 'phone' | 'tablet' | 'desktop';
    showEditorPanel?: boolean;
    generationStartTime?: number;
}
export interface ProjectPreviewRef {
    getCode: () => string | undefined;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(
    ({ project, isGenerating, device = 'desktop', showEditorPanel = true, generationStartTime }, ref) => {

        const iframeRef = useRef<HTMLIFrameElement>(null);

        const [selectedElement, setSelectedElement] = useState<any>(null);

        const resolution = {
            phone: 'w-[412px]',
            tablet: 'w-[768px]',
            desktop: 'w-full'
        }

        useImperativeHandle(ref, () => ({
            getCode: () => {
                const doc = iframeRef.current?.contentDocument;
                if (!doc) return undefined;

                doc.querySelectorAll('.ai-selected-element, [data-ai-selected]').forEach(el => {
                    el.classList.remove('ai-selected-element');
                    el.removeAttribute('data-ai-selected');
                    (el as HTMLElement).style.outline = '';
                })

                const previewStype = doc.getElementById('ai-preview-style');
                if (previewStype) {
                    previewStype.remove();
                }

                const previewScript = doc.getElementById('ai-preview-style');
                if (previewScript) {
                    previewScript.remove();
                }

                const html = doc.documentElement.outerHTML;
                return html;
            }
        }))

        useEffect(() => {
            const handleMessage = (event: MessageEvent) => {
                if (event.data.type === 'ELEMENT_SELECTED') {
                    setSelectedElement(event.data.payload);
                } else if (event.data.type === 'CLEAR_SELECTION') {
                    setSelectedElement(null);
                }
            }
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, []);

        const handleUpdate = (updates: any) => {
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                    type: 'UPDATE_ELEMENT',
                    payload: updates
                }, '*');
            }
        }

        const injectPreview = (html: string) => {
            if (!html) return '';
            if (!showEditorPanel) return html;

            if (html.includes('</body>')) {
                return html.replace('</body>', iframeScript + '</body>');
            } else {
                return html + iframeScript;
            }

        }

        return (
            <div className='relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2'>
                {project.current_code ? (
                    <>
                        <iframe ref={iframeRef} srcDoc={injectPreview(project.current_code)} className={`${resolution[device]} h-full max-sm:w-full mx-auto transition-all`} />
                        {showEditorPanel && selectedElement && (
                            <EditorPanel selectedElement={selectedElement} onUpdate={handleUpdate} onClose={() => {
                                if (iframeRef.current?.contentWindow) {
                                    iframeRef.current.contentWindow.postMessage({
                                        type: 'CLEAR_SELECTION_REQUEST'
                                    }, '*');
                                }
                                setSelectedElement(null);
                            }} />
                        )}
                    </>) : isGenerating &&
                <LoaderSteps startTime={generationStartTime} />
                }

            </div>
        )
    })

ProjectPreview.displayName = 'ProjectPreview';
export default ProjectPreview