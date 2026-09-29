"use client";
import { ActionForm } from "../../../../components/ActionForm";
import { supportAction } from "../../../actions/student";

export function SupportForm() {
  return (
    <ActionForm action={supportAction} submit="Send request" pendingLabel="Sending…">
      <div className="field"><label htmlFor="subject">Subject</label><input id="subject" name="subject" type="text" maxLength={120} required /></div>
      <div className="field"><label htmlFor="message">What do you need help with?</label><textarea id="message" name="message" maxLength={2000} required /><span className="hint">Do not include your password.</span></div>
    </ActionForm>
  );
}
