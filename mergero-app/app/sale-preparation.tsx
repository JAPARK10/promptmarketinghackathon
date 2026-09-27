'use client';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Assessment } from '@/lib/assessment';

export function SaleReadinessGuide(){return <section className="sale-guide"><h3>A short guide to getting sale-ready</h3><p>Document all key business processes so someone else can run the company without relying on you. Keep financial records up to date, organise customer and supplier contracts, and clarify who owns each responsibility. Identify dependencies on major customers or key people, then prepare a simple handover plan that explains how the business can continue under a new owner.</p></section>}

export function BuyerPractice({assessment}:{assessment:Assessment}){
 const [open,setOpen]=useState(false),[step,setStep]=useState(0),[answers,setAnswers]=useState(['','','','']),[review,setReview]=useState(false);
 const money=(n:number)=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
 const questions=[
  {question:`You reported ${money(assessment.revenue)} in revenue and ${money(assessment.profit)} in operating profit. What explains that result, and how repeatable is it?`,hint:'Explain recurring revenue, unusual costs and recent changes. Prepare accounts that support the figures.'},
  {question:`With ${assessment.employees} employees, what would happen if you stepped away for 30 days?`,hint:'Name who would make decisions, which processes are documented and where the team still depends on you.'},
  {question:'What would happen if your largest customer left?',hint:'Prepare the share of revenue from major customers, contract terms and a plan to reduce concentration.'},
  {question:'What must a future owner preserve, and what role would you want after the handover?',hint:'Explain your priorities for the team, brand and location. Describe a realistic transition period and your future responsibilities.'}
 ];
 function download(){const content=questions.map((q,i)=>`${i+1}. ${q.question}\n\nYour answer: ${answers[i]}\n\nPreparation: ${q.hint}`).join('\n\n');const url=URL.createObjectURL(new Blob(['Mergero buyer conversation practice\nGuided demo, not AI-evaluated.\n\n'+content],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='mergero-buyer-practice.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <><button type="button" className="call-preview" onClick={()=>setOpen(true)}><span className="call-icon"><MessageCircle size={21}/></span><span><strong>Practise an AI buyer conversation</strong><small>Interactive guided demo. Prepare your answers.</small></span></button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="practice-dialog"><DialogTitle>Practise your buyer conversation</DialogTitle><DialogDescription>Guided demo with prepared questions based on your figures. No live AI evaluation. Answers stay in this page and are not shared with buyers.</DialogDescription>
 {!review?<><p className="practice-counter">Question {step+1} of {questions.length}</p><h3>{questions[step].question}</h3><label htmlFor="practice-answer">Your answer</label><Textarea id="practice-answer" rows={5} maxLength={4000} value={answers[step]} placeholder="Explain it as you would to a potential buyer…" onChange={e=>setAnswers(old=>old.map((a,i)=>i===step?e.target.value:a))}/><details className="practice-tip"><summary>What a buyer would want to understand</summary><p>{questions[step].hint}</p></details><div className="actions"><Button type="button" variant="ghost" disabled={step===0} onClick={()=>setStep(step-1)}>Previous</Button><Button type="button" className="primary" disabled={!answers[step].trim()} onClick={()=>step===questions.length-1?setReview(true):setStep(step+1)}>{step===questions.length-1?'Review my preparation':'Next question'}</Button></div></>:<><h3>Your preparation notes</h3>{questions.map((q,i)=><section className="practice-review" key={q.question}><strong>{q.question}</strong><p>{answers[i]}</p><small>To prepare: {q.hint}</small></section>)}<div className="actions"><Button type="button" variant="ghost" onClick={()=>{setReview(false);setStep(0)}}>Edit answers</Button><Button type="button" className="primary" onClick={download}>Download my notes</Button></div></>}
 </DialogContent></Dialog></>;
}
