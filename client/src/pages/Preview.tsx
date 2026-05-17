import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import api from "@/config/axios";
import type { Version } from "@/types";
import { authClient } from "@/lib/auth-client";

const Preview = () => {
    const { data: session, isPending } = authClient.useSession();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const { projectId, versionId } = useParams();

    const fetchCode = async () => {
        try {
            const { data } = await api.get(`/api/project/preview/${projectId}`);
            setCode(data.project.current_code);
            if (versionId) {
                data.project.versions.forEach((version: Version) => {
                    if (version.id === versionId) {
                        setCode(version.code);
                    }
                })
            } setLoading(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
            console.log(error);
        }
    }

    useEffect(() => {
        if (!isPending) {
            if (session?.user) {
                fetchCode();
            } else {
                toast.error("Please login to view preview");
                setLoading(false);
            }
        }
    }, [session?.user, isPending]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <Loader2Icon className="size-7 animate-spin text-indigo-200" />
        </div>
    }

    if (!code) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-white text-gray-500">
                <p>No preview available yet. The code might still be generating.</p>
            </div>
        )
    }

    return (
        <div className="h-screen w-full bg-white">
            {code && (
                <iframe srcDoc={code} title="Project Preview" className="w-full h-full border-none" />
            )}
        </div>
    )
}

export default Preview