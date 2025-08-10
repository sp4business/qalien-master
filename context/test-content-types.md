# Content Type Classification Test Guide

## Test Scenarios

### 1. Non-Marketing Content (Should FAIL)
- **Test**: Upload a personal video (e.g., video of your dog, family vacation, random scenery)
- **Expected Result**: 
  - Classification: "Non-Marketing"
  - Result: FAIL
  - Reasoning: "This appears to be personal content without any marketing or promotional intent"

### 2. UGC Marketing Content (Should PASS)
- **Test**: Upload a user-generated style ad (e.g., TikTok product review, Instagram reel promoting a product)
- **Expected Result**:
  - Classification: "UGC"
  - Result: PASS
  - Reasoning: "Authentic user-generated content with clear marketing intent"

### 3. Branded Commercial (Should PASS)
- **Test**: Upload a professional advertisement
- **Expected Result**:
  - Classification: "Branded"
  - Result: PASS
  - Reasoning: "Professional advertisement with clear marketing goals"

## How to Test

1. Upload a test video through the Campaign Detail page
2. Wait for processing to complete
3. Click on the asset to view the Creative Detail Modal
4. Check the "Content Type" section in the compliance report
5. Verify the classification, pass/fail status, and reasoning

## What to Look For

- **Marketing Intent Detection**: The system should correctly identify whether content has promotional/marketing intent
- **Style Classification**: For marketing content, it should distinguish between UGC and Branded styles
- **Pass/Fail Logic**: Only Non-Marketing content should fail; both UGC and Branded marketing content should pass
- **Clear Reasoning**: Each classification should include a clear explanation

## Monitoring Logs

To see detailed processing logs:
```bash
npx supabase functions logs process-ai-job-queue --tail
```

Look for these log entries:
- `📱 CONTENT TYPE ANALYSIS - Gemini Response`
- `📱 CONTENT TYPE DEBUG - Frontend Report`
- `MARKETING INTENT:` 
- `CONTENT CLASSIFICATION:`