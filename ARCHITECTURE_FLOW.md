# Resume Builder: Flow Diagrams & LLM-as-a-Judge Architecture

This document provides both a **Simple Single-Flow Diagram** for quick understanding and the **Complete Multi-Stage Architecture** with dedicated **LLM-as-a-Judge** verification loops for every AI touchpoint.

---

## 1. Simple Flow: Resume Tailoring with LLM-as-a-Judge

This diagram illustrates the core job-tailoring pipeline, highlighting how an **LLM-as-a-Judge** layer prevents hallucinations, fake skill claims, and metric inflation before generating the resume.

```mermaid
flowchart TD
    %% Styling
    classDef step fill:#f0f9ff,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef llm fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef judge fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#991b1b;
    classDef success fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#166534;

    A["1. Candidate submits Resume + Target Job Description (JD)"]:::step --> B["2. Worker LLM: Gemini 2.5 Flash\n(Reframes bullets to align with JD)"]:::llm

    B --> C["3. LLM-as-a-Judge\n(Audits for Hallucination & Factuality)"]:::judge

    %% Decision branches
    C -- "Fake skills or inflated metrics detected!" --> D["Feedback Loop:\nStrip unverified claims & re-ground"]:::judge
    D --> B

    C -- "Passed:\n100% grounded in candidate background" --> E["4. Generate LaTeX & Compile to PDF (texlive.net)"]:::step

    E --> F["5. Candidate receives verified 1-page PDF Resume"]:::success
```

### Simple Flow Step-by-Step Breakdown:
1. **Input:** The candidate provides their current resume and target Job Description (JD).
2. **Worker LLM ([geminiService.js](file:///c:/Users/Yashmit/Downloads/resume-builder/backend/services/geminiService.js#L269)):** Analyzes the JD and reframes the candidate's existing experience to highlight relevant responsibilities and keywords.
3. **LLM-as-a-Judge (Safety Guardrail):** Audits the output against the candidate's original background:
   - *Did the model invent tools or frameworks the candidate never used?*
   - *Were any numbers or metrics inflated (e.g. changing 10% to 80%)?*
   - *Are all statements believable and defensible in an interview?*
4. **Correction Loop:** If any unearned claim is detected, the judge sends specific feedback to the worker LLM to strip the fabrication.
5. **Compilation & Output:** Once approved, the resume is compiled into a pixel-perfect, 1-page PDF.

---

## 2. Full End-to-End System Flow

```mermaid
flowchart TD
    %% Styling
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef backend fill:#f3f4f6,stroke:#4b5563,stroke-width:2px,color:#1f2937;
    classDef llm fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef judge fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#991b1b;
    classDef ext fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#5b21b6;
    classDef success fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#166534;

    subgraph ClientLayer ["1. Client Layer (React / Vite Frontend)"]
        UI_Upload["Candidate Uploads PDF Resume"]:::client
        UI_Review["Data Review & Inline Form Editor"]:::client
        UI_GitHub["Input Public GitHub Repo URLs"]:::client
        UI_JD["Paste Job Description & Target Role"]:::client
        UI_Template["Select Template (College / Off-Campus)"]:::client
        UI_Preview["Interactive PDF Viewer & LaTeX Editor"]:::client
    end

    subgraph IngestionStage ["2. Ingestion & Extraction Pipeline"]
        PDF_Parser["PDF Text & Link Extractor (pdfjs-dist / pdf-parse)"]:::backend
        LLM1["Layer 1: Resume Extraction LLM (Gemini 2.5 Flash)"]:::llm
        Judge1{"Judge 1: Extraction & Grounding Judge"}:::judge
    end

    subgraph AugmentationStage ["3. Enrichment & Tailoring Pipeline"]
        GH_Service["GitHub Blueprint Fetcher (Tree + Manifests + README)"]:::backend
        LLM2["Layer 2: GitHub Architecture Analyzer LLM"]:::llm
        Judge2{"Judge 2: Codebase Grounding Judge"}:::judge
        
        LLM3["Layer 3: Content Enhancement & STAR Rewriter LLM"]:::llm
        Judge3{"Judge 3: Metric Fidelity & Action Verb Judge"}:::judge

        LLM4["Layer 4: Job Description Tailoring LLM"]:::llm
        Judge4{"Judge 4: Anti-Fabrication & Transferability Judge"}:::judge
    end

    subgraph SynthesisStage ["4. LaTeX Synthesis & Single-Page Guarantee"]
        LLM5["Layer 5: LaTeX Code Generator LLM"]:::llm
        Judge5{"Judge 5: LaTeX Syntax & Schema Preserver"}:::judge
        Compiler["Remote LaTeX Compiler (texlive.net API)"]:::ext
        PageCheck{"PDF Page Count Checker (pdf-lib)"}:::backend
        LLM6["Layer 6: Single-Page Dynamic Truncation LLM"]:::llm
        Judge6{"Judge 6: Truncation Pruning Judge"}:::judge
        LogoStamper["NSUT Watermark / Logo Stamper (pdf-lib)"]:::backend
    end

    %% Ingestion Transitions
    UI_Upload --> PDF_Parser
    PDF_Parser --> LLM1
    LLM1 --> Judge1
    Judge1 -- "Fails Ground Truth Verification" --> LLM1
    Judge1 -- "Verified Structured JSON" --> UI_Review

    %% Enrichment Transitions
    UI_Review --> UI_GitHub
    UI_GitHub --> GH_Service
    GH_Service --> LLM2
    LLM2 --> Judge2
    Judge2 -- "Claims Missing Tech" --> LLM2
    Judge2 -- "Verified Capabilities" --> UI_Review

    UI_Review --> LLM3
    LLM3 --> Judge3
    Judge3 -- "Metric Inflated / Invented" --> LLM3
    Judge3 -- "Verified ATS Bullets" --> UI_Review

    UI_Review --> UI_JD
    UI_JD --> LLM4
    LLM4 --> Judge4
    Judge4 -- "Fabricated Job/Skills Detected" --> LLM4
    Judge4 -- "Grounded Tailored Data" --> UI_Template

    %% Generation Transitions
    UI_Template --> LLM5
    LLM5 --> Judge5
    Judge5 -- "LaTeX Syntax or Schema Error" --> LLM5
    Judge5 -- "Sanitized LaTeX (.tex)" --> Compiler

    Compiler --> PageCheck
    PageCheck -- "Pages > 1 (Overflow)" --> LLM6
    LLM6 --> Judge6
    Judge6 -- "Unauthorized Rewrite" --> LLM6
    Judge6 -- "Valid Pruned .tex" --> Compiler
    PageCheck -- "Pages == 1 (Perfect Fit)" --> LogoStamper

    LogoStamper --> UI_Preview
```

---

## 3. Sequence Diagram: Multi-Layer Judge Inspection

```mermaid
sequenceDiagram
    autonumber
    actor User as Candidate / User
    participant Frontend as Frontend UI
    participant Backend as Backend Controller
    participant LLM as Generative LLM (Worker)
    participant Judge as LLM-as-a-Judge (Auditor)
    participant Ext as TeXLive / PDF-Lib

    %% --- LAYER 1: EXTRACTION ---
    rect rgb(240, 249, 255)
    note over User, Judge: LAYER 1: Raw Resume PDF Extraction
    User->>Frontend: Upload Resume PDF
    Frontend->>Backend: POST /api/parse-resume (Multipart PDF)
    Backend->>Backend: Extract Raw Text & Hyperlinks (pdfjs-dist)
    Backend->>LLM: Prompt: Extract Structured Resume JSON
    LLM-->>Judge: Proposed Resume JSON
    Judge->>Judge: Audit: Cross-check against raw text & URLs
    alt Hallucination / Mismapped Links / Dropped History
        Judge-->>LLM: Rejection + Feedback: "URL mapped to wrong project; CGPA altered"
        LLM-->>Judge: Corrected Resume JSON
    end
    Judge-->>Backend: Approved Candidate JSON
    Backend-->>Frontend: Structured Profile in State
    end

    %% --- LAYER 2: GITHUB CODEBASE BLUEPRINT ---
    rect rgb(254, 243, 199)
    note over User, Judge: LAYER 2: Public GitHub Architecture Analysis
    User->>Frontend: Paste GitHub Repo URL
    Frontend->>Backend: POST /api/analyze-github
    Backend->>Backend: Fetch File Tree + Manifests (package.json, Dockerfile)
    Backend->>LLM: Prompt: Synthesize Architecture & Built Features
    LLM-->>Judge: Proposed Tech Stack & Feature Bullets
    Judge->>Judge: Audit: Verify claimed tech in package.json and file paths
    alt Phantom Technology / Exaggeration
        Judge-->>LLM: Rejection: "Redis not in package.json; remove caching claim"
        LLM-->>Judge: Grounded Feature Bullets
    end
    Judge-->>Backend: Verified Architecture Blueprint
    Backend-->>Frontend: Verified Project Capabilities Added
    end

    %% --- LAYER 3: BULLET ENHANCEMENT ---
    rect rgb(243, 244, 246)
    note over User, Judge: LAYER 3: STAR Bullet Enhancement
    User->>Frontend: Click "Enhance with AI" on Experience / Projects
    Frontend->>Backend: POST /api/enhance (Section Data)
    Backend->>LLM: Prompt: Rewrite with strong action verbs & impact
    LLM-->>Judge: Enhanced Section JSON
    Judge->>Judge: Metric Check: Original vs Enhanced Metrics
    alt Metric Inflation Detected (e.g. 10% became 75%)
        Judge-->>LLM: Rejection: "Fidelity violation: retain exact user metrics"
        LLM-->>Judge: Metric-Faithful ATS Bullets
    end
    Judge-->>Backend: Approved Enhanced JSON
    Backend-->>Frontend: Updated Resume Form
    end

    %% --- LAYER 4: JOB DESCRIPTION TAILORING ---
    rect rgb(254, 226, 226)
    note over User, Judge: LAYER 4: Job Description Tailoring
    User->>Frontend: Submit Target Job Description + Role
    Frontend->>Backend: POST /api/tailor-resume
    Backend->>LLM: Prompt: Reframe & Align with JD (No Fabrication)
    LLM-->>Judge: Tailored Resume Data + Adaptations Summary
    Judge->>Judge: Hallucination Check: Compare against Original Resume + GitHub
    alt Fabricated Credentials / Phantom Experience
        Judge-->>LLM: Rejection: "Candidate never worked with Kubernetes; revert claim"
        LLM-->>Judge: Grounded Tailored Resume JSON
    end
    Judge-->>Backend: Approved Tailored Profile
    Backend-->>Frontend: Tailored Resume + Adaptations Summary
    end

    %% --- LAYER 5: LATEX GENERATION ---
    rect rgb(237, 233, 254)
    note over User, Judge: LAYER 5: LaTeX Code Generation
    Frontend->>Backend: POST /api/generate-latex (Template: College / Off-Campus)
    Backend->>LLM: Prompt: Populate LaTeX Template with Resume JSON
    LLM-->>Judge: Proposed LaTeX Code (.tex)
    Judge->>Judge: Linting: Escape check (%, _, &), empty itemize check, placeholder purge
    alt Syntax Defects / Unescaped Characters
        Judge-->>LLM: Rejection: "Unescaped underscore on line 42; empty itemize found"
        LLM-->>Judge: Cleaned, compilable LaTeX Code
    end
    Judge-->>Backend: Approved .tex Document
    end

    %% --- LAYER 6: SINGLE PAGE TRUNCATION LOOP ---
    rect rgb(220, 252, 231)
    note over Backend, Ext: LAYER 6: Single-Page Guarantee & Dynamic Truncation
    Backend->>Ext: POST https://texlive.net/cgi-bin/latexcgi (Compile .tex)
    Ext-->>Backend: Compiled PDF Buffer
    Backend->>Ext: Check Page Count via pdf-lib
    alt Page Count > 1 (Overflow)
        loop Max 4 Truncation Iterations
            Backend->>LLM: Prompt: Prune least significant bullet points
            LLM-->>Judge: Truncated LaTeX Code
            Judge->>Judge: Diff Check: Verify ONLY minor bullets removed; structure intact
            Judge-->>Backend: Approved Truncated .tex
            Backend->>Ext: Recompile PDF & Check Page Count
        end
    end
    Backend->>Ext: Stamp NSUT Logo (if College template)
    Backend-->>Frontend: Final Base64 PDF + LaTeX Source
    Frontend-->>User: Display Single-Page PDF & Enable Export
    end
```

---

## 4. LLM-as-a-Judge Verification Rubric Matrix

| LLM Layer | Worker Task | Primary Hallucination Risks | Judge Verification Rubric & Invariant Checks | Remediation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1: Resume Extraction** | Parses messy PDF text and hyperlinks into structured JSON. | Inventing dates/grades, hallucinating degrees, mapping GitHub URLs to wrong projects. | **Ground-Truth Anchor:** 100% of names, institutions, dates, and bullet text must exist as substrings or verbatim semantics in the raw PDF text. Link domains must match correct targets. | Send extraction diff back to LLM with the raw text excerpt to enforce fidelity. |
| **Layer 2: GitHub Analyzer** | Reads repo file tree, package manifests, and README to identify architecture. | Claiming popular frameworks (e.g. Redis, Docker) that do not exist in `package.json` or tree. | **Manifest Invariant:** Every claimed tool or library must be present in the repository dependency manifest or file paths. | Strip ungrounded technologies; retain only verifiable code patterns. |
| **Layer 3: Content Enhancement** | Converts passive bullets to active STAR format with metrics. | Metric inflation (e.g. changing "improved speed" to "increased speed by 90%"). | **Numerical Invariant:** No new numbers or percentages may be generated unless explicitly provided by the candidate. | Enforce verbatim retention of all existing metrics while upgrading verbs. |
| **Layer 4: Job Tailoring** | Aligns candidate background with JD terminology without lying. | Fabricating whole skills or jobs just to match ATS keywords. | **Anti-Fabrication Invariant:** Skills and experiences must be a strict subset or legitimate reframing of Original Data + Verified GitHub Context. | Calculate Hallucination Score; if > 0, reject additions and fall back to semantic reframing. |
| **Layer 5: LaTeX Generation** | Populates template placeholders with JSON data into valid `.tex`. | Unescaped TeX special characters (`_`, `%`, `&`), unclosed environments, dropped sections. | **Grammar & Completeness Invariant:** Preamble must match template; all special characters escaped in display text; zero empty `\item` blocks. | Auto-patch common escape slips and re-prompt if structural blocks are broken. |
| **Layer 6: Page Truncation** | Selectively trims bullets to force PDF onto 1 page. | Accidental deletion of entire primary projects, broken LaTeX tags (`\end{itemize}`). | **Pruning Constraint:** Structural tags must match 1-to-1 with input; maximum 1-2 bullets removed per iteration; high-priority sections protected. | Verify AST tag balance before submitting to remote compiler. |
