import { X } from 'lucide-react';
import { useEffect, useState } from 'react'

interface EditorPanelProps {
    selectedElement: {
        tagName: string;
        className: string;
        text: string;
        styles: {
            padding: string;
            margin: string;
            color: string;
            backgroundColor: string;
            fontSize: string;
        }
    } | null;
    onUpdate: (updates: any) => void;
    onClose: () => void;
}

const EditorPanel = ({ selectedElement, onUpdate, onClose }: EditorPanelProps) => {

    const [values, setValues] = useState(selectedElement)

    useEffect(() => {
        setValues(selectedElement);
    }, [selectedElement]);

    if (!selectedElement || !values) return null;

    const handleChange = (field: string, value: string) => {
        const newValues = { ...values, [field]: value };
        if (field in values.styles) {
            newValues.styles = { ...values.styles, [field]: value }
        }
        setValues(newValues);
        onUpdate({ [field]: value });
    }

    const rgbToHex = (color: string) => {
        if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return '#ffffff';
        if (color.startsWith('#')) return color;
        const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return '#ffffff';
        return '#' + [match[1], match[2], match[3]].map(x => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    const handleStyleChange = (styleName: string, value: string) => {
        const newStyles = { ...values.styles, [styleName]: value };
        setValues({ ...values, styles: newStyles });
        onUpdate({ styles: { [styleName]: value } });
    }

    return (
        <div className='absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-fade-in fade-in'>
            <div className='flex justify-between items-center mb-4'>
                <h3 className='font-semibold text-gray-800'>Edit Element</h3>
                <button onClick={onClose} className='hover:bg-gray-100 rounded-full p-1'>
                    <X className='w-4 h-4 text-gray-500' />
                </button>
            </div>
            <div className='space-y-4 text-black'>
                <div>
                    <label className='block text-xs font-medium text-gray-500 mb-1'>Text Content</label>
                    <textarea value={values.text} onChange={(e) => handleChange('text', e.target.value)} className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none min-h-20' />
                </div>

                <div>
                    <label className='block text-xs font-medium text-gray-500 mb-1'>Class Name</label>
                    <input type='text' value={values.className || ''} onChange={(e) => handleChange('className', e.target.value)} className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none' />
                </div>

                <div className='grid grid-cols-2 gap-3'>
                    <div>
                        <label className='block text-xs font-medium text-gray-500 mb-1'>Padding</label>
                        <input type='text' value={values.styles.padding}
                            onChange={(e) => handleStyleChange('padding', e.target.value)} className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none' />
                    </div>
                    <div>
                        <label className='block text-xs font-medium text-gray-500 mb-1'>Margin</label>
                        <input type='text' value={values.styles.margin}
                            onChange={(e) => handleStyleChange('margin', e.target.value)} className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none' />
                    </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                    <div>
                        <label className='block text-xs font-medium text-gray-500 mb-1'>Font Size</label>
                        <input type='text' value={values.styles.fontSize}
                            onChange={(e) => handleStyleChange('fontSize', e.target.value)} className='w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none' />
                    </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                    <div>
                        <label className='block text-xs font-medium text-gray-500 mb-1'>Background</label>
                        <div className='flex items-center gap-2 border border-gray-400 rounded-md p-1'>
                            <input type='color' value={rgbToHex(values.styles.backgroundColor)}
                                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} className='w-6 h-6 rounded cursor-pointer border-none p-0' />
                            <span className='text-xs text-gray-600 truncate'>{values.styles.backgroundColor}</span>
                        </div>
                    </div>
                    <div>
                        <label className='block text-xs font-medium text-gray-500 mb-1'>Text Color</label>
                        <div className='flex items-center gap-2 border border-gray-400 rounded-md p-1'>
                            <input type='color' value={rgbToHex(values.styles.color)}
                                onChange={(e) => handleStyleChange('color', e.target.value)} className='w-6 h-6 rounded cursor-pointer border-none p-0' />
                            <span className='text-xs text-gray-600 truncate'>{values.styles.color}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EditorPanel