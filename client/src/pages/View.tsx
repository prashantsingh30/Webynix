import { useParams } from "react-router-dom";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import api from "@/config/axios";


const View = () => {
    const { projectId } = useParams();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchCode = async () => {
        try {
            const { data } = await api.get(`/api/project/published/${projectId}`);
            setCode(data.code)
            setLoading(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
            console.log(error);
        }
    }

    useEffect(() => {
        fetchCode();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <Loader2Icon className="size-7 animate-spin text-indigo-200" />
        </div>
    }

    return (
        <div className="h-screen w-full bg-white">
            {code && (
                <iframe srcDoc={code} title="Project View" className="w-full h-full border-none" />
            )}
        </div>
    )
}

export default View