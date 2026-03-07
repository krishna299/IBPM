
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CreatePlanModal({ open, onOpenChange }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Production Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          Plan creation form will go here
        </div>
      </DialogContent>
    </Dialog>
  )
}