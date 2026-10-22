"use client";

import { useActionState } from "react";
import { submitConsultation, type FormState } from "@/app/actions";

const initialState: FormState = {};

type FieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  error?: string;
  value?: string;
  required?: boolean;
  type?: string;
};

function TextField({ id, name, label, placeholder, error, value, required, type = "text" }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete={name === "fullName" ? "name" : name === "email" ? "email" : name === "whatsapp" ? "tel" : undefined}
      />
      {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}

export function ConsultationForm() {
  const [state, action, pending] = useActionState(submitConsultation, initialState);
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className="consultation-form">
      <div className="form-grid">
        <TextField id="fullName" name="fullName" label="Full Name" placeholder="Your full name" required error={errors.fullName} value={values.fullName} />
        <TextField id="email" name="email" label="Active Email" placeholder="you@example.com" type="email" required error={errors.email} value={values.email} />
        <TextField id="whatsapp" name="whatsapp" label="WhatsApp Number" placeholder="+977 98XXXXXXXX" type="tel" required error={errors.whatsapp} value={values.whatsapp} />
        <TextField id="businessName" name="businessName" label="Business Name" placeholder="Your business name" required error={errors.businessName} value={values.businessName} />
        <div className="field form-wide">
          <TextField id="website" name="website" label="Website or Facebook URL" placeholder="https://yourbusiness.com" error={errors.website} value={values.website} />
        </div>
        <div className="field form-wide">
          <label htmlFor="message">Anything You Want to Say</label>
          <textarea id="message" name="message" rows={4} maxLength={3000} placeholder="Share anything that would help us understand your business." defaultValue={values.message} />
        </div>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="companyFax">Leave this field empty</label>
        <input id="companyFax" name="companyFax" tabIndex={-1} autoComplete="off" />
      </div>

      {state.formError && <p className="form-error" role="alert">{state.formError}</p>}
      <button className="button button-primary form-submit" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Get My Free Consultation"}
        {!pending && <span aria-hidden="true">→</span>}
      </button>
      <p className="privacy-note">We respect your privacy. No spam.</p>
      {!process.env.NEXT_PUBLIC_FORM_LIVE && (
        <p className="demo-note">Demo mode: the form validates your details but does not send or store them. Configure a secure lead endpoint before launch.</p>
      )}
    </form>
  );
}
