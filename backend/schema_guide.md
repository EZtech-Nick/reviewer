# Google Sheets Structure Guide

To use the system, the Google Sheet associated with your App Script must have the following tabs and headers.

**Note:** The provided `Code.gs` includes a `setupSheet()` function. Run that function once inside the Apps Script editor to generate these automatically.

## 1. Sheet Name: `Subjects`
Stores the list of available subjects.

| Row | A (SubjectName) |
|-----|-----------------|
| 1   | SubjectName     |
| 2   | English         |
| 3   | Mathematics     |
| ... | ...             |

## 2. Sheet Name: `Questions`
Stores the database of questions.

| Col | Header | Description |
|-----|--------|-------------|
| A | ID | Unique timestamp ID |
| B | Subject | Subject Name |
| C | Type | Question Type (e.g., 'Multiple Choice') |
| D | QuestionText | The question content |
| E | ImageURL | Optional link to an image |
| F | Options | JSON Array of options (for Multiple Choice) |
| G | MatchingPairs | JSON Array of pairs (for Matching Type) |
| H | CorrectAnswer | The answer key |
| I | Points | Number of points |

## 3. Sheet Name: `Results`
Stores student submissions.

| Col | Header | Description |
|-----|--------|-------------|
| A | ID | Unique ID |
| B | Timestamp | Date of submission |
| C | StudentName | Name of student |
| D | Subject | Subject Name |
| E | Score | Points earned |
| F | TotalPoints | Max possible points |
| G | Status | 'graded' or 'pending' |
| H | Answers | JSON Object of student answers |

**Logic Note:**
The system is designed to automatically keep only the 5 most recent entries per Subject in the `Results` sheet to save space and keep the leaderboard fresh.