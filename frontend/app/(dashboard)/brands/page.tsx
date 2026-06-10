"use client";

import { useState } from "react";
import { useAnalytics, Brand, FAQ } from "@/hooks/useAnalytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SkeletonCard } from "@/components/common/LoadingSkeleton";
import { Plus, Trash2, Edit3, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export default function BrandsManagementPage() {
  const { useBrands, createBrand, updateBrand, deleteBrand } = useAnalytics();
  const { data: brandsRes, isLoading, refetch } = useBrands();
  const brandsList = brandsRes?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const [brandName, setBrandName] = useState("");
  const [customGreeting, setCustomGreeting] = useState("");
  const [tone, setTone] = useState<"formal" | "casual">("casual");
  const [faqs, setFaqs] = useState<FAQ[]>([{ question: "", answer: "" }]);

  const handleOpenCreateModal = () => {
    setEditingBrand(null);
    setBrandName("");
    setCustomGreeting("");
    setTone("casual");
    setFaqs([{ question: "", answer: "" }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.brand_name);
    setCustomGreeting(brand.custom_greeting || "");
    setTone(brand.tone || "casual");
    setFaqs(brand.faqs.length > 0 ? brand.faqs : [{ question: "", answer: "" }]);
    setIsModalOpen(true);
  };

  const handleAddFaqField = () => {
    setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  };

  const handleRemoveFaqField = (idx: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFaqChange = (idx: number, field: "question" | "answer", val: string) => {
    setFaqs((prev) =>
      prev.map((faq, i) => (i === idx ? { ...faq, [field]: val } : faq))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error("Brand name is required.");
      return;
    }

    const filteredFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());

    const payload = {
      brand_name: brandName.trim(),
      custom_greeting: customGreeting.trim() || null,
      tone,
      faqs: filteredFaqs,
      email_config: {},
    };

    try {
      if (editingBrand) {
        await updateBrand({ brandId: editingBrand.id, payload });
      } else {
        await createBrand(payload);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to save brand config", error);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (confirm("Are you sure you want to delete this brand configuration? This cannot be undone.")) {
      try {
        await deleteBrand(brandId);
        refetch();
      } catch (error) {
        console.error("Failed to delete brand", error);
      }
    }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1">
          <h2 className="text-xl font-bold font-heading text-text-primary tracking-tight">
            D2C Brands
          </h2>
          <p className="text-xs text-text-muted">
            Configure brand guidelines, automated chatbot FAQs, greetings, and AI responder tones.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreateModal}
          className="h-9 px-3 flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Add Brand</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : brandsList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center text-text-muted border border-dashed border-border/80">
          <HelpCircle className="h-10 w-10 mb-4 text-text-muted/60" />
          <h4 className="text-sm font-semibold text-text-primary mb-1">No brands configured</h4>
          <p className="text-xs text-text-muted mb-4">Click &quot;Add Brand&quot; to set up your first D2C brand guideline.</p>
          <Button variant="secondary" size="sm" onClick={handleOpenCreateModal}>Add Brand</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {brandsList.map((brand) => (
            <Card key={brand.id} className="flex flex-col justify-between">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40 mb-4 text-left">
                <div>
                  <h3 className="text-sm font-bold font-heading text-text-primary tracking-tight">
                    {brand.brand_name}
                  </h3>
                  <span className="text-[10px] text-text-muted font-mono block">ID: {brand.id}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant={brand.tone === "formal" ? "default" : "info"} className="capitalize">
                    Tone: {brand.tone}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-left text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">Custom Greeting</span>
                  <p className="text-xs text-text-primary italic leading-relaxed bg-surface/50 border border-border/80 p-2.5 rounded-lg">
                    &quot;{brand.custom_greeting || "Hello! Welcome to our support queue."}&quot;
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">FAQs Configured ({brand.faqs.length})</span>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-surface/30 p-2 rounded-lg divide-y divide-border/40">
                    {brand.faqs.length === 0 ? (
                      <span className="text-text-muted italic block py-1.5">No FAQs created.</span>
                    ) : (
                      brand.faqs.map((faq, index) => (
                        <div key={index} className="py-2 first:pt-0 last:pb-0">
                          <p className="font-semibold text-text-primary">Q: {faq.question}</p>
                          <p className="text-text-muted mt-0.5">A: {faq.answer}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
              <div className="flex items-center justify-end mt-4 pt-4 border-t border-border/40 space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditModal(brand)}
                  className="h-8 px-2.5 text-text-muted hover:text-text-primary hover:bg-surface"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  <span className="text-[11px]">Edit Settings</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteBrand(brand.id)}
                  className="h-8 px-2.5 text-text-muted hover:text-danger hover:bg-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span className="text-[11px]">Delete Config</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBrand ? "Edit Brand Config" : "Register Brand Guide"}
        description="Scopes Tone and FAQs to feed neural networks responses for this D2C brand."
        className="max-w-xl max-h-[85vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Input
            label="Brand Name"
            type="text"
            required
            placeholder="e.g. EcoStyle"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />

          <Select
            label="AI Copilot Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as "formal" | "casual")}
          >
            <option value="casual">Casual (Friendly, conversational)</option>
            <option value="formal">Formal (Professional, respectful)</option>
          </Select>

          <div className="flex flex-col space-y-1.5 w-full text-left">
            <label className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">Greeting Message</label>
            <textarea
              rows={2}
              placeholder="Welcome greeting..."
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              className="flex w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-none"
            />
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase pl-0.5">Brand Knowledge base (FAQs)</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddFaqField} className="h-7 text-[10px]">
                Add FAQ Field
              </Button>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-3 bg-background border border-border rounded-xl space-y-2 relative animate-scaleUp">
                  {faqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFaqField(idx)}
                      className="absolute top-2 right-2 text-text-muted hover:text-danger p-1 hover:bg-surface rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Input
                    label="Question"
                    type="text"
                    placeholder="e.g. What is the return policy?"
                    value={faq.question}
                    onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                    className="h-9 text-xs"
                  />
                  <div className="flex flex-col space-y-1.5 w-full text-left">
                    <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider pl-0.5">Answer</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. We accept returns within 30 days of purchase."
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                      className="flex w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingBrand ? "Save Changes" : "Create Brand"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
