
import React, { useState, useRef, useEffect } from 'react';
import { BellSchedule, GlobalParams, Subject, Grade, Class, Teacher, TeacherType, SubjectType, Language, ModelConfig } from '../types.ts';
import { translations } from '../i18n.ts';
import { saveDataset } from '../services/main.ts';

interface DataManagementProps {
  language: Language;
  loaded: boolean;
  bell: BellSchedule; setBell: (b: BellSchedule) => void;
  params: GlobalParams; setParams: (p: GlobalParams) => void;
  subjects: Subject[]; setSubjects: (s: Subject[]) => void;
  grades: Grade[]; setGrades: (g: Grade[]) => void;
  classes: Class[]; setClasses: (c: Class[]) => void;
  teachers: Teacher[]; setTeachers: (t: Teacher[]) => void;
  modelConfig: ModelConfig; setModelConfig: (m: ModelConfig) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ 
  language,
  loaded,
  bell, setBell, 
  params, setParams, 
  subjects, setSubjects, 
  grades, setGrades, 
  classes, setClasses, 
  teachers, setTeachers,
  modelConfig, setModelConfig 
}) => {
  const [activeSection, setActiveSection] =
    useState<'bell' | 'subjects' | 'grades' | 'teachers' | 'model'>('bell');
  const t = translations[language];

  useEffect(() => {
    if (!loaded) return; 
    const timeout = setTimeout(() => {
      saveDataset(
        bell,
        params,
        subjects,
        grades,
        classes,
        teachers,
        modelConfig
      ).catch(() => {});
    }, 800); // 800ms delay

    return () => clearTimeout(timeout);
  }, [bell, params, subjects, grades, classes, teachers, modelConfig]);

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 space-y-1 sticky top-24 self-start">
        <NavButton 
          active={activeSection === 'bell'} 
          onClick={() => setActiveSection('bell')} 
          icon="fa-clock" 
          label={t.bellSchedule} 
          desc={t.bellDesc}
        />
        <NavButton 
          active={activeSection === 'subjects'} 
          onClick={() => setActiveSection('subjects')} 
          icon="fa-book" 
          label={t.subjects} 
          desc={t.subjectsDesc}
        />
        <NavButton 
          active={activeSection === 'grades'} 
          onClick={() => setActiveSection('grades')} 
          icon="fa-users" 
          label={t.grades} 
          desc={t.gradesDesc}
        />
        <NavButton 
          active={activeSection === 'teachers'} 
          onClick={() => setActiveSection('teachers')} 
          icon="fa-chalkboard-teacher" 
          label={t.teachers} 
          desc={t.teachersDesc}
        />
        <NavButton
          active={activeSection === 'model'}
          onClick={() => setActiveSection('model')}
          icon="fa-sliders-h"
          label="Model Config"
          desc="Solver weights"
        />
      </aside>

      {/* Form Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-h-[calc(100vh-6rem)] flex flex-col">
          {activeSection === 'bell' && (<div className="flex-1 overflow-y-auto"><BellForm language={language} bell={bell} setBell={setBell} params={params} setParams={setParams} /></div>)}
          {activeSection === 'subjects' && (<div className="flex-1 overflow-y-auto"><SubjectForm language={language} subjects={subjects} setSubjects={setSubjects} bell={bell} /></div>)}
          {activeSection === 'grades' && (<div className="flex-1 overflow-y-auto"><GradeClassForm language={language} grades={grades} setGrades={setGrades} classes={classes} setClasses={setClasses} subjects={subjects} /></div>)}
          {activeSection === 'teachers' && (<div className="flex-1 overflow-y-auto"><TeacherForm language={language} teachers={teachers} setTeachers={setTeachers} subjects={subjects} classes={classes} bell={bell} /></div>)}
          {activeSection === 'model' && (<div className="flex-1 overflow-y-auto"><ModelConfigForm language={language} modelConfig={modelConfig} setModelConfig={setModelConfig}/></div>
)}
        </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string, desc: string }> = ({ active, onClick, icon, label, desc }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl transition-all border ${active ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-100' : 'hover:bg-slate-100 border-transparent text-slate-500'}`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div className={`font-bold text-sm ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{label}</div>
        <div className="text-xs opacity-80">{desc}</div>
      </div>
    </div>
  </button>
);

// --- Sub-Forms ---

const BellForm: React.FC<{ language: Language, bell: BellSchedule, setBell: (b: BellSchedule) => void, params: GlobalParams, setParams: (p: GlobalParams) => void }> = ({ language, bell, setBell, params, setParams }) => {
  const t = translations[language];
  return (
    <div className="space-y-8 px-6 pt-6 pb-6">
      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fas fa-calendar-alt text-indigo-600"></i>
          {t.weeklyStructure}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.daysPerWeek}</label>
            <input 
              type="number" value={bell.daysPerWeek} onChange={e => setBell({...bell, daysPerWeek: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fas fa-sun text-indigo-600"></i>
          {t.morningSession}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.morningPeriods}</label>
            <input 
              type="number" value={bell.morningPeriods} onChange={e => setBell({...bell, morningPeriods: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.breakAfter}</label>
            <input 
              type="number" value={bell.morningBreakAfter} onChange={e => setBell({...bell, morningBreakAfter: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fas fa-moon text-indigo-600"></i>
          {t.afternoonSession}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.afternoonPeriods}</label>
            <input 
              type="number" value={bell.afternoonPeriods} onChange={e => setBell({...bell, afternoonPeriods: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.breakAfter}</label>
            <input 
              type="number" value={bell.afternoonBreakAfter} onChange={e => setBell({...bell, afternoonBreakAfter: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fas fa-flag text-indigo-600"></i>
          {t.specialActivities}
        </h3>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={bell.hasFlagSalute ?? false}
            onChange={e => setBell({ ...bell, hasFlagSalute: e.target.checked })}
            className="accent-indigo-600 w-5 h-5"
          />
          <label className="text-sm font-medium text-slate-700">
            {t.enableFlagSalute}
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i className="fas fa-coins text-indigo-600"></i>
          {t.financialParams}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.extraPay}</label>
            <input 
              type="number" step="0.1" value={params.extraPayMultiplier} onChange={e => setParams({...params, extraPayMultiplier: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.maxExtra}</label>
            <input 
              type="number" value={params.maxExtraPeriods} onChange={e => setParams({...params, maxExtraPeriods: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const SubjectForm: React.FC<{ language: Language, subjects: Subject[], setSubjects: (s: Subject[]) => void, bell: BellSchedule }> = ({ language, subjects, setSubjects, bell }) => {
  const t = translations[language];
  const addSubject = () => {
    const newSub: Subject = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: language === 'vi' ? 'Môn học mới' : 'New Subject', 
      type: SubjectType.MAIN, 
      maxPeriodsPerDay: 1, 
      noConsecutiveDays: false, 
      fixedSlots: [],
      optionalPayRate: 0,
      mustBeHomeroom: false
    };
    setSubjects([...subjects, newSub]);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(subjects.length);

  useEffect(() => {
    if (subjects.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = subjects.length;
  }, [subjects.length]);

  return (
    <div className="space-y-6 px-6 pb-6">
      <div className="sticky top-0 z-20 bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {t.subjectCatalog}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {language === 'vi'
                ? `Tổng: ${subjects.length} môn`
                : `Total: ${subjects.length} subjects`}
            </p>
          </div>
        <button onClick={addSubject} className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
          <i className="fas fa-plus-circle"></i> {t.addSubject}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-3 font-bold text-xs text-slate-400 uppercase tracking-widest">{t.name}</th>
              <th className="pb-3 font-bold text-xs text-slate-400 uppercase tracking-widest">{t.type}</th>
              <th className="pb-3 font-bold text-xs text-slate-400 uppercase tracking-widest">{t.maxDay}</th>
              <th className="pb-3 font-bold text-xs text-slate-400 uppercase tracking-widest">{language === 'vi' ? 'Đơn giá (tiết)' : 'Payrate'}</th>
              <th className="pb-3 font-bold text-xs text-slate-400 uppercase tracking-widest">{t.nonConsecutive}</th>
              <th className="pb-3 font-bold text-xs text-slate-400 uppercase tracking-widest">{language === 'vi' ? 'Bắt buộc GVCN' : 'Must Homeroom'}</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(s => (
              <React.Fragment key={s.id}>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3">
                    <input
                      className="bg-transparent font-medium focus:outline-indigo-500 rounded px-1"
                      value={s.name}
                      onChange={e => updateSubject(s.id, { name: e.target.value })}
                    />
                  </td>

                  <td className="py-3">
                    <select
                      value={s.type}
                      onChange={e =>
                        updateSubject(s.id, {
                          type: e.target.value as SubjectType,
                          optionalPayRate:
                            e.target.value === SubjectType.OPTIONAL
                              ? s.optionalPayRate ?? 0
                              : undefined
                        })
                      }
                      className="bg-transparent text-sm focus:outline-indigo-500 rounded px-1"
                    >
                      <option value={SubjectType.MAIN}>
                        {language === 'vi' ? 'Chính' : 'Main'}
                      </option>
                      <option value={SubjectType.EXTRA}>
                        {language === 'vi' ? 'Phụ' : 'Extra'}
                      </option>
                      <option value={SubjectType.OPTIONAL}>
                        {language === 'vi' ? 'Tự chọn' : 'Optional'}
                      </option>
                    </select>
                  </td>

                  <td className="py-3">
                    <input
                      type="number"
                      className="w-16 bg-transparent text-sm focus:outline-indigo-500 rounded px-1"
                      value={s.maxPeriodsPerDay}
                      onChange={e => updateSubject(s.id, { maxPeriodsPerDay: Number(e.target.value) })}
                    />
                  </td>

                  <td className="py-3">
                    {s.type === SubjectType.OPTIONAL ? (
                      <input
                        type="number"
                        min={0}
                        className="w-24 bg-transparent text-sm border border-slate-200 rounded px-2 py-1 focus:outline-indigo-500"
                        value={s.optionalPayRate ?? 0}
                        onChange={e => {
                          const value = Number(e.target.value);
                          updateSubject(s.id, {
                            optionalPayRate: isNaN(value) || value < 0 ? 0 : value
                          });
                        }}
                      />
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  <td className="py-3">
                    <input
                      type="checkbox"
                      checked={s.noConsecutiveDays}
                      onChange={e => updateSubject(s.id, { noConsecutiveDays: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4"
                    />
                  </td>

                  <td className="py-3">
                    <input
                      type="checkbox"
                      checked={s.mustBeHomeroom ?? false}
                      onChange={e =>
                        updateSubject(s.id, { mustBeHomeroom: e.target.checked })
                      }
                      className="accent-indigo-600 w-4 h-4"
                    />
                  </td>

                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() =>
                        updateSubject(s.id, {
                          fixedSlots: [...s.fixedSlots, { day: 1 }]
                        })
                      }
                      className="text-indigo-500 text-xs font-bold hover:underline"
                    >
                      + {language === 'vi' ? 'Vị trí cố định' : 'Fixed Slot'}
                    </button>

                    <button
                      onClick={() => setSubjects(subjects.filter(sub => sub.id !== s.id))}
                      className="text-slate-300 hover:text-rose-500"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>

                {s.fixedSlots.length > 0 && (
                  <tr className="bg-slate-50/40">
                    <td colSpan={7} className="py-3 px-4">
                      <div className="space-y-2">
                        {s.fixedSlots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-4 text-sm">
                            
                            {/* Day Selector */}
                            <select
                              value={slot.day}
                              onChange={e => {
                                const newSlots = [...s.fixedSlots];
                                newSlots[idx].day = Number(e.target.value);
                                updateSubject(s.id, { fixedSlots: newSlots });
                              }}
                              className="border border-slate-200 rounded px-2 py-1"
                            >
                              {Array.from({ length: bell.daysPerWeek }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>
                                  {language === 'vi' ? `Ngày ${d}` : `Day ${d}`}
                                </option>
                              ))}
                            </select>

                            {/* Period Selector (Optional) */}
                            <select
                              value={slot.period ?? ''}
                              onChange={e => {
                                const newSlots = [...s.fixedSlots];
                                const val = e.target.value;
                                newSlots[idx].period = val === '' ? undefined : Number(val);
                                updateSubject(s.id, { fixedSlots: newSlots });
                              }}
                              className="border border-slate-200 rounded px-2 py-1"
                            >
                              <option value="">
                                {language === 'vi' ? 'Cả ngày' : 'Any Period'}
                              </option>
                              {Array.from(
                                { length: bell.morningPeriods + bell.afternoonPeriods },
                                (_, i) => i + 1
                              ).map(p => (
                                <option key={p} value={p}>
                                  {language === 'vi' ? `Tiết ${p}` : `Period ${p}`}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => {
                                const newSlots = s.fixedSlots.filter((_, i) => i !== idx);
                                updateSubject(s.id, { fixedSlots: newSlots });
                              }}
                              className="text-rose-500 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div><div ref={bottomRef} />
    </div>
  );
};

const GradeClassForm: React.FC<{ language: Language, grades: Grade[], setGrades: (g: Grade[]) => void, classes: Class[], setClasses: (c: Class[]) => void, subjects: Subject[] }> = ({ language, grades, setGrades, classes, setClasses, subjects }) => {
  const t = translations[language];
  const addGrade = () => {
    setGrades([...grades, { id: Date.now().toString(), name: language === 'vi' ? 'Khối mới' : 'New Grade', subjects: [] }]);
  };

  const addClass = (gradeId: string) => {
    setClasses([...classes, { id: Date.now().toString(), name: language === 'vi' ? 'Lớp mới' : 'New Class', gradeId }]);
  };

  const toggleSubject = (gradeId: string, subId: string) => {
    setGrades(grades.map(g => {
      if (g.id !== gradeId) return g;
      const existing = g.subjects.find(s => s.subjectId === subId);
      if (existing) {
        return { ...g, subjects: g.subjects.filter(s => s.subjectId !== subId) };
      }
      return { ...g, subjects: [...g.subjects, { subjectId: subId, periods: 1 }] };
    }));
  };

  const updateGradeSubjectPeriods = (gradeId: string, subId: string, periods: number) => {
    setGrades(grades.map(g => {
      if (g.id !== gradeId) return g;
      return { ...g, subjects: g.subjects.map(s => s.subjectId === subId ? { ...s, periods } : s) };
    }));
  };

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(grades.length);

  useEffect(() => {
    if (grades.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = grades.length;
  }, [grades.length]);

  return (
    <div className="space-y-10 px-6 pb-6">
      <div className="sticky top-0 z-20 bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {t.studentGroups}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {language === 'vi'
              ? `Tổng: ${grades.length} khối • ${classes.length} lớp`
              : `Total: ${grades.length} grades • ${classes.length} classes`}
          </p>
        </div>
        <button onClick={addGrade} className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
          <i className="fas fa-plus-circle"></i> {t.addGrade}
        </button>
      </div>
      {grades.map(g => {
        //Dynamically compute total periods
        const totalRequired = g.subjects.reduce(
          (sum, s) => sum + s.periods,
          0
        );
        return (
          <div key={g.id} className="border border-slate-200 rounded-xl p-6 bg-slate-50/30">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <input 
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none"
                  value={g.name} onChange={e => setGrades(grades.map(gr => gr.id === g.id ? { ...gr, name: e.target.value } : gr))}
                />
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{language === 'vi' ? 'Cấu hình cho cấp học này' : 'Configuration for this level'}</p>
              </div>
              <button onClick={() => setGrades(grades.filter(gr => gr.id !== g.id))} className="text-slate-400 hover:text-rose-500 transition-colors">
                <i className="fas fa-trash"></i>
              </button>
            </div>

            {g.subjects.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-indigo-800">
                    {language === 'vi'
                      ? 'Tổng số tiết mỗi lớp'
                      : 'Total Periods Per Class'}
                  </span>
                  <span className="text-lg font-bold text-indigo-900">
                    {totalRequired}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{language === 'vi' ? 'Các Lớp' : 'Classes'}</h4>
                <div className="space-y-2">
                  {classes.filter(c => c.gradeId === g.id).map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <input 
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        value={c.name} onChange={e => setClasses(classes.map(cl => cl.id === c.id ? { ...cl, name: e.target.value } : cl))}
                      />
                      <button onClick={() => setClasses(classes.filter(cl => cl.id !== c.id))} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addClass(g.id)} className="text-indigo-600 text-xs font-bold hover:underline py-1">+ {t.addClass}</button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{t.requirements}</h4>
                <div className="space-y-3">
                  {subjects.map(sub => {
                    const assigned = g.subjects.find(gs => gs.subjectId === sub.id);
                    return (
                      <div key={sub.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={!!assigned} onChange={() => toggleSubject(g.id, sub.id)} className="accent-indigo-600" />
                          <span className={assigned ? 'text-slate-900 font-medium' : 'text-slate-400'}>{sub.name}</span>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              className="w-12 px-2 py-1 border border-slate-200 rounded text-center text-xs"
                              value={assigned.periods} 
                              onChange={e => updateGradeSubjectPeriods(g.id, sub.id, Number(e.target.value))}
                            />
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{t.periodsWk}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}<div ref={bottomRef} />
    </div>
  );
};

const TeacherForm: React.FC<{ language: Language, teachers: Teacher[], setTeachers: (t: Teacher[]) => void, subjects: Subject[], classes: Class[], bell: BellSchedule }> = ({ language, teachers, setTeachers, subjects, classes, bell }) => {
  const t = translations[language];
  const addTeacher = () => {
    setTeachers([...teachers, {
      id: Date.now().toString(),
      name: language === 'vi' ? 'Giảng viên mới' : 'New Instructor',
      type: TeacherType.NON_HOMEROOM,
      subjectIds: [],
      minPeriodsPerWeek: 15,
      payRate: 40,
      //availability: []
    }]);
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setTeachers(teachers.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleSubject = (teacherId: string, subId: string) => {
    const teach = teachers.find(tr => tr.id === teacherId);
    if (!teach) return;
    const newSubjects = teach.subjectIds.includes(subId) 
      ? teach.subjectIds.filter(id => id !== subId) 
      : [...teach.subjectIds, subId];
    updateTeacher(teacherId, { subjectIds: newSubjects });
  };

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(teachers.length);

  useEffect(() => {
    if (teachers.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = teachers.length;
  }, [teachers.length]);

  return (
    <div className="space-y-8 px-6 pb-6">
      <div className="sticky top-0 z-20 bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {t.faculty}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {language === 'vi'
              ? `Tổng: ${teachers.length} giáo viên`
              : `Total: ${teachers.length} teachers`}
          </p>
        </div>
        <button onClick={addTeacher} className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
          <i className="fas fa-plus-circle"></i> {t.addTeacher}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {teachers.map(teach => (
          <div key={teach.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <input 
                className="text-lg font-bold bg-transparent border-b border-transparent focus:border-indigo-600 focus:outline-none"
                value={teach.name} onChange={e => updateTeacher(teach.id, { name: e.target.value })}
              />
              <button onClick={() => setTeachers(teachers.filter(tr => tr.id !== teach.id))} className="text-slate-300 hover:text-rose-500 p-1">
                <i className="fas fa-trash text-sm"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.contract}</label>
                <select 
                  value={teach.type} onChange={e => {
                    const newType = e.target.value as TeacherType;

                    updateTeacher(teach.id, {
                      type: newType,
                      minPeriodsPerWeek:
                        newType === TeacherType.OUTSOURCED
                          ? 0
                          : teach.minPeriodsPerWeek
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={TeacherType.HOMEROOM}>{language === 'vi' ? 'Chủ nhiệm' : 'Homeroom'}</option>
                  <option value={TeacherType.NON_HOMEROOM}>{language === 'vi' ? 'Tiêu chuẩn' : 'Standard'}</option>
                  <option value={TeacherType.OUTSOURCED}>{language === 'vi' ? 'Thuê ngoài' : 'Outsourced'}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.hourlyRate}</label>
                <input 
                  type="number" value={teach.payRate} onChange={e => updateTeacher(teach.id, { payRate: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {teach.type === TeacherType.HOMEROOM && (
              <div className="mb-4 animate-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.assignedClass}</label>
                <select 
                  value={teach.homeroomClassId} onChange={e => updateTeacher(teach.id, { homeroomClassId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">{language === 'vi' ? 'Chọn lớp...' : 'Select a class...'}</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t.canTeach}</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => toggleSubject(teach.id, sub.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${teach.subjectIds.includes(sub.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>

            {teach.type !== TeacherType.OUTSOURCED && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {t.minCommitment}
                </label>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={teach.minPeriodsPerWeek}
                    onChange={e =>
                      updateTeacher(teach.id, {
                        minPeriodsPerWeek: Number(e.target.value)
                      })
                    }
                    className="flex-1 accent-indigo-600"
                  />

                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={1}
                    value={teach.minPeriodsPerWeek}
                    onChange={e => {
                      let value = Number(e.target.value);
                      if (isNaN(value)) value = 0;
                      if (value < 0) value = 0;
                      if (value > 30) value = 30;

                      updateTeacher(teach.id, {
                        minPeriodsPerWeek: value
                      });
                    }}
                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500"
                  />

                  <p className="text-[10px] text-slate-400 mt-1">
                    {t.periodsWk}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div><div ref={bottomRef} />
    </div>
  );
};


const ModelConfigForm: React.FC<{
  modelConfig: ModelConfig;
  setModelConfig: (m: ModelConfig) => void;
}> = ({ modelConfig, setModelConfig }) => {

  const configItems = [
    { key: "costWeight", label: "Cost Weight" },
    { key: "homeroomPenaltyWeight", label: "Homeroom Main Subject Penalty" },
    { key: "minLoadPenaltyWeight", label: "Teacher Underload Penalty" }
  ] as const;

  return (
    <div className="space-y-8 px-6 pt-6 pb-6">
      <h3 className="text-lg font-bold text-slate-900">
        Model Configuration
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configItems.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-600">
              {label}
            </label>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={modelConfig[key]}
                onChange={(e) =>
                  setModelConfig({
                    ...modelConfig,
                    [key]: Number(e.target.value)
                  })
                }
                className="w-28 border rounded px-2 py-1 text-sm"
              />
            </div>

            {modelConfig[key] === 0 && (
              <span className="text-xs text-amber-500">
                Disabled (weight = 0)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataManagement;
