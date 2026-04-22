"use client"

import { useState, useEffect } from "react";
import { addStaff, getStaff, removeStaff } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Trash2, User, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function StaffPage() {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadStaff();
    }, []);

    async function loadStaff() {
        const data = await getStaff();
        setStaffList(data);
    }

    async function handleAddStaff(e: React.FormEvent) {
        e.preventDefault();
        if (!name) return;

        setIsLoading(true);
        try {
            await addStaff(name, role);
            toast.success("Staff added successfully");
            setName("");
            setRole("");
            loadStaff();
        } catch (error) {
            toast.error("Failed to add staff");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRemoveStaff(id: string) {
        if (!confirm("Are you sure you want to remove this staff member?")) return;

        try {
            await removeStaff(id);
            toast.success("Staff removed");
            loadStaff();
        } catch (error) {
            toast.error("Failed to remove staff");
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#191A43]">Team Management</h1>
                    <p className="text-slate-500 mt-1">Manage your production staff and assignments.</p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-[#CE0003]" />
                        Add New Staff Member
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddStaff} className="flex gap-4">
                        <Input 
                            placeholder="Staff Name (e.g., Kofi Mensah)" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <Input 
                            placeholder="Role (e.g., Lead Tailor)" 
                            value={role} 
                            onChange={(e) => setRole(e.target.value)}
                        />
                        <Button type="submit" disabled={isLoading} className="bg-[#191A43] hover:bg-[#191A43]/90">
                            {isLoading ? "Adding..." : "Add Staff"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffList.map((person) => (
                    <Card key={person.id} className="border-slate-100 hover:border-slate-200 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                    <User className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{person.name}</h3>
                                    <p className="text-xs text-slate-500">{person.role || "No role assigned"}</p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoveStaff(person.id)}
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {staffList.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-slate-400">No staff members added yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
