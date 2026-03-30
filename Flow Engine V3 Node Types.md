# FlowEngine V3 Node Types Documentation

## Overview

FlowEngineV4 is a sophisticated conversational flow engine with typed nodes that provide clear functional boundaries and predictable execution. The engine supports 8 different node types, each designed for specific tasks in building conversational AI flows.

## Core Architecture

- **Typed Nodes**: Each node has a specific type with well-defined behavior
- **Deterministic Routing**: Routes are declared with conditions, with optional LLM classification
- **Single Variables Dictionary**: Used for templating and routing decisions
- **Global Interrupts**: Handled as part of capture turns
- **Auto-advance**: Only `variable_capture` nodes consume user input; everything else auto-advances

---

## 1. Prompt Node

**Purpose**: Display messages to the user and optionally capture information (legacy mode)

**Type**: `"prompt"`

### Structure

```json
{
  "type": "prompt",
  "say": {
    "text": "Hello ${user_name}! How can I help you today?",
    "mode": "deterministic" | "generative",
    "instructions": ["Be friendly and professional"],
    "model": "azure:gpt-4o-mini" // Optional model override
  },
  "capture": { // Optional - prefer separate variable_capture nodes
    "vars": ["user_input"],
    "instructions": ["Extract the user's main concern"],
    "model": "azure:gpt-4o-mini" // Optional model override
  },
  "next": { "goto": "next_node_id" },
  "wait_for_user": true // Legacy - defaults to true
}
```

### Key Features

- **Say Modes**:
  - `"deterministic"`: Uses exact text with variable substitution
  - `"generative"`: LLM generates response based on text and instructions
- **Variable Substitution**: Uses `${variable_name}` syntax
- **Auto-advance**: Always moves to next node after displaying message
- **Legacy Capture**: Optional capture field for backward compatibility

### Use Cases

- Welcome messages
- Information display
- Questions and prompts
- Status updates

---

## 2. Variable Capture Node

**Purpose**: Extract specific variables from user input using LLM

**Type**: `"variable_capture"`

### Structure

```json
{
  "type": "variable_capture",
  "vars": ["user_name", "phone_number", "email"],
  "instructions": [
    "Extract the user's full name",
    "Look for 10-digit phone numbers",
    "Find email addresses in standard format"
  ],
  "next": { "goto": "next_node_id" },
  "model": "azure:gpt-4o-mini" // Optional model override
}
```

### Key Features

- **Targeted Extraction**: Specifies exactly which variables to extract
- **LLM-Powered**: Uses language models to understand and extract information
- **Waiting Node**: Stops execution and waits for user input
- **Flexible Instructions**: Guide the LLM on how to extract variables

### Use Cases

- Collecting user information (name, contact details)
- Extracting specific data from natural language
- Form filling and data collection
- Intent classification with variable extraction

---

## 3. Decision Node

**Purpose**: Route conversation flow based on conditions or LLM classification

**Type**: `"decision"`

### Structure

#### Deterministic Mode

```json
{
  "type": "decision",
  "mode": "deterministic",
  "routes": {
    "cases": [
      {
        "when": [
          { "var": "user_intent", "op": "==", "value": "loan_inquiry" },
          { "var": "loan_amount", "op": "!=", "value": null }
        ],
        "target": { "goto": "loan_details_node" }
      }
    ],
    "default": { "goto": "general_inquiry_node" }
  }
}
```

#### LLM Mode

```json
{
  "type": "decision",
  "mode": "llm",
  "options": {
    "loan_inquiry": "User wants to know about loans",
    "account_issue": "User has account problems",
    "general": "General inquiry"
  },
  "output_var": "classified_intent",
  "model": "azure:gpt-4o-mini", // Optional model override
  "routes": { // Optional routing based on classification
    "cases": [
      {
        "when": [{ "var": "classified_intent", "op": "==", "value": "loan_inquiry" }],
        "target": { "goto": "loan_flow" }
      }
    ],
    "default": { "goto": "general_flow" }
  }
}
```

### Key Features

- **Two Modes**: Deterministic (condition-based) or LLM-based classification
- **Condition Operators**: `==` and `!=` with case-insensitive string comparison
- **Multiple Conditions**: AND logic between multiple conditions
- **Fallback Routing**: Default target when no conditions match

### Use Cases

- Intent classification
- Conditional routing based on collected data
- A/B testing paths
- Complex business logic routing

---

## 4. API Node

**Purpose**: Make HTTP requests to external services and map responses to variables

**Type**: `"api"`

### Structure

```json
{
  "type": "api",
  "request": {
    "method": "POST" | "GET" | "PUT" | "PATCH" | "DELETE",
    "endpoint": "https://api.example.com/users/${user_id}",
    "headers": {
      "Authorization": "Bearer ${api_token}",
      "Content-Type": "application/json"
    },
    "body": {
      "name": "${user_name}",
      "email": "${user_email}"
    },
    "timeout": 30
  },
  "map": {
    "user_status": "$.data.status",
    "account_balance": "$.data.accounts[0].balance",
    "error_message": "$.error.message"
  },
  "on_error_set": {
    "api_error": true,
    "error_message": "API call failed"
  },
  "next": { "goto": "process_api_response" }
}
```

### Key Features

- **HTTP Methods**: Supports all major HTTP methods
- **Variable Interpolation**: Variables in endpoint, headers, and body
- **JSON Path Mapping**: Extract specific data from API responses using JSONPath
- **Error Handling**: Set variables on API failures
- **Timeout Control**: Configurable request timeouts

### JSONPath Examples

- `$.data.status` - Get status from data object
- `$.users[0].name` - Get name from first user in array
- `$.error.message` - Get error message

### Use Cases

- Database queries
- External service integration
- Data validation
- Third-party API calls

---

## 5. Tool Node

**Purpose**: Execute custom Python code for complex operations

**Type**: `"tool"`

### Structure

```json
{
  "type": "tool",
  "tool_name": "loan_calculator",
  "tool_description": "Calculates loan eligibility and EMI",
  "tool_code": "
def run(variables, args):
    import math
  
    principal = variables.get('loan_amount', 0)
    rate = variables.get('interest_rate', 0) / 100 / 12
    months = variables.get('loan_tenure', 0) * 12
  
    if principal <= 0 or rate <= 0 or months <= 0:
        return {'error': 'Invalid loan parameters'}
  
    emi = principal * rate * (1 + rate)**months / ((1 + rate)**months - 1)
    total_payment = emi * months
  
    return {
        'monthly_emi': round(emi, 2),
        'total_payment': round(total_payment, 2),
        'total_interest': round(total_payment - principal, 2)
    }
  ",
  "tool_args": {
    "processing_fee": 500
  },
  "on_error_set": {
    "calculation_error": true
  },
  "next": { "goto": "display_loan_results" }
}
```

### Key Features

- **Custom Python**: Execute any Python code
- **Sandboxed**: Runs in isolated environment
- **Variable Access**: Full access to conversation variables
- **Return Values**: Must return a dictionary with new/updated variables
- **Error Handling**: Sets variables on execution failures
- **Compilation**: Tools are compiled at initialization for error detection

### Requirements

- Must define a `run(variables, args)` function
- `run()` must return a dictionary
- Variables parameter contains current conversation state
- Args parameter contains tool_args from configuration

### Use Cases

- Complex calculations
- Data transformations
- Business logic implementation
- Integration with Python libraries

---

## 6. Update Variables Node

**Purpose**: Set or update conversation variables

**Type**: `"update_vars"`

### Structure

```json
{
  "type": "update_vars",
  "set": {
    "user_authenticated": true,
    "session_start_time": "${current_timestamp}",
    "welcome_message": "Welcome ${user_name}!",
    "counter": "${counter + 1}",
    "loan_eligibility": "${income * 0.4}"
  },
  "next": { "goto": "next_node_id" }
}
```

### Key Features

- **Variable Setting**: Set multiple variables at once
- **Template Support**: Use existing variables in new values
- **Math Operations**: Basic arithmetic in templates
- **Auto-advance**: Immediately moves to next node

### Use Cases

- Initialize variables
- Update counters
- Set flags and status
- Prepare data for next nodes

---

## 7. End Node

**Purpose**: End the conversation with a final message

**Type**: `"end"`

### Structure

```json
{
  "type": "end",
  "say": {
    "text": "Thank you for calling ${company_name}. Have a great day!",
    "mode": "deterministic" | "generative",
    "instructions": ["End the conversation politely"],
    "model": "azure:gpt-4o-mini" // Optional model override
  }
}
```

### Key Features

- **Final Message**: Display closing message to user
- **Conversation Termination**: Marks conversation as ended
- **Template Support**: Use variables in final message
- **Generative Option**: LLM can generate personalized closing

### Use Cases

- Call completion
- Session termination
- Final confirmations
- Polite goodbyes

---

## 8. LLM Router Node

**Purpose**: Intelligent routing using LLM classification with confidence scoring

**Type**: `"llm_router"`

### Structure

#### Simple Format

```json
{
  "type": "llm_router",
  "options": {
    "loan_inquiry": "User wants to know about loan products",
    "account_issue": "User has problems with their account",
    "payment_help": "User needs help with payments",
    "general": "General customer service inquiry"
  },
  "listen": false,
  "confidence_threshold": 0.7, // Optional override setting 
  "model": "azure:gpt-4o-mini" // Optional model override
}
```

#### Full Format with Custom Targets

```json
{
  "type": "llm_router",
  "options": {
    "loan_inquiry": {
      "description": "User wants to know about loan products and eligibility",
      "target": { "goto": "loan_qualification_flow" }
    },
    "account_issue": {
      "description": "User has problems with their existing account",
      "target": { "goto": "account_support_flow" }
    },
    "payment_help": {
      "description": "User needs assistance with loan payments or dues",
      "target": { "goto": "payment_assistance_flow" }
    },
    "general": {
      "description": "General customer service inquiry not covered above",
      "target": { "goto": "general_support_flow" }
    }
  },
  "listen": false,
  "confidence_threshold": 0.7,
  "model": "azure:gpt-4o-mini"
}
```

### Key Features

- **Intelligent Classification**: Uses LLM to understand user intent
- **Confidence Scoring**: Routes only when confidence meets threshold
- **Auto-Target Creation**: Simple format automatically creates targets
- **Custom Targets**: Full format allows custom routing per option
- **Listen Mode**: When `listen: true`, waits for user input before classifying
- **Re-ask on Low Confidence**: Automatically re-prompts when confidence is low

### Behavior Modes

#### Auto-Route Mode (`listen: false`) (recommended)

- Automatically classifies based on conversation history
- Routes immediately if confidence ≥ threshold
- Re-asks previous prompt if confidence < threshold

#### Listen Mode (`listen: true`)

- Waits for user input before classification
- Acts like a variable_capture node
- Classifies the user's response and routes accordingly

### Confidence Threshold Guidelines

- **0.9-1.0**: User's intent is explicitly clear
- **0.7-0.9**: User's intent strongly suggests one route
- **0.5-0.7**: User's intent is ambiguous but one route seems likely
- **0.0-0.5**: Cannot determine intent (will re-ask)

### Use Cases

- Intent classification at conversation start
- Natural language routing
- Complex decision points
- Fallback routing when deterministic conditions aren't sufficient

---

## Flow-Level Configuration

### Basic Structure

```json
{
  "version": "4.0.0",
  "start": "welcome_node",
  "feature_flags": {
    "flow_engine_v3_enabled": true
  },
  "variables_schema": {
    "user_name": {
      "type": "string",
      "description": "Customer's full name"
    },
    "loan_amount": {
      "type": "number",
      "description": "Requested loan amount"
    }
  },
  "llm_defaults": {
    "model": "azure:gpt-4.1-mini",
    "instructions": [
      "You are a helpful banking assistant",
      "Be professional and courteous",
      "Always verify important information"
    ]
  },
  "interrupts": {
    "help_request": {
      "description": "User asks for help or doesn't understand",
      "target": { "system": "REITERATE" }
    },
    "end_session": {
      "description": "User wants to end the call",
      "target": { "goto": "END" }
    }
  },
  "nodes": {
    // Node definitions here
  }
}
```

### Flow Components

#### Variables Schema

- Define expected variables with types and descriptions
- Used for validation and documentation
- Types: `string`, `number`, `boolean`, `array`, `object`

#### LLM Defaults

- Global instructions applied to all LLM calls
- Default model for nodes without specific model
- Consistent behavior across the flow

#### Interrupts

- Global handlers for common user intents
- Can route to specific nodes or system behaviors
- System behaviors: `REITERATE` (repeat last message)

#### Feature Flags

- Enable/disable experimental features
- Control flow behavior variations

---

## Best Practices

### Node Design

1. **Single Responsibility**: Each node should do one thing well
2. **Clear Naming**: Use descriptive node IDs
3. **Error Handling**: Always handle potential failures
4. **Variable Validation**: Set default values where appropriate

### Flow Architecture

1. **Linear Flow**: Keep main conversation paths linear
2. **Clear Entry/Exit**: Every sub-flow should have clear start and end points
3. **State Management**: Use variables to track conversation state
4. **Fallback Paths**: Always have default routes for unexpected inputs

### LLM Usage

1. **Specific Instructions**: Provide clear, concise instructions
2. **Context Management**: Include relevant history in prompts
3. **Confidence Thresholds**: Set appropriate thresholds for routing
4. **Model Selection**: Choose appropriate models for each task

### Performance

1. **API Timeouts**: Set reasonable timeouts for external calls
2. **Tool Optimization**: Keep tool code efficient
3. **Variable Scope**: Minimize unnecessary variable storage
4. **Auto-advance**: Use auto-advance to reduce conversation turns

---

## Example Complete Flow

```json
{
  "version": "4.0.0",
  "start": "greeting",
  "variables_schema": {
    "user_name": {"type": "string", "description": "Customer name"},
    "inquiry_type": {"type": "string", "description": "Type of inquiry"},
    "loan_amount": {"type": "number", "description": "Requested loan amount"}
  },
  "llm_defaults": {
    "model": "azure:gpt-4.1-mini",
    "instructions": [
      "You are a professional banking assistant",
      "Be helpful and courteous",
      "Verify important information before proceeding"
    ]
  },
  "interrupts": {
    "help": {
      "description": "User asks for help",
      "target": {"system": "REITERATE"}
    }
  },
  "nodes": {
    "greeting": {
      "type": "prompt",
      "say": {
        "text": "Hello! Welcome to our bank. How can I help you today?",
        "mode": "generative",
        "instructions": ["Be warm and welcoming"]
      },
      "next": {"goto": "classify_inquiry"}
    },
  
    "classify_inquiry": {
      "type": "llm_router",
      "options": {
        "loan": "User wants to inquire about loans",
        "account": "User has account-related questions",
        "general": "General banking inquiry"
      },
      "confidence_threshold": 0.7
    },
  
    "loan": {
      "type": "prompt",
      "say": {
        "text": "I'd be happy to help with loan information. What type of loan are you interested in?",
        "mode": "generative",
        "instructions": ["Ask about loan type and amount"]
      },
      "next": {"goto": "capture_loan_details"}
    },
  
    "capture_loan_details": {
      "type": "variable_capture",
      "vars": ["loan_type", "loan_amount"],
      "instructions": [
        "Extract the type of loan (personal, home, car, etc.)",
        "Extract the loan amount if mentioned"
      ],
      "next": {"goto": "loan_details"}
    },
  
    "loan_details": {
      "type": "tool",
      "tool_name": "loan_calculator",
      "tool_description": "Calculate loan details",
      "tool_code": "
def run(variables, args):
    amount = variables.get('loan_amount', 0)
    loan_type = variables.get('loan_type', 'personal')
  
    # Simple interest rates by type
    rates = {'personal': 0.12, 'home': 0.08, 'car': 0.10}
    rate = rates.get(loan_type, 0.12)
  
    monthly_rate = rate / 12
    months = 60  # 5 years default
  
    if amount > 0:
        emi = amount * monthly_rate * (1 + monthly_rate)**months / ((1 + monthly_rate)**months - 1)
        return {
            'monthly_emi': round(emi, 2),
            'interest_rate': rate * 100,
            'loan_term_years': 5
        }
    return {'error': 'Invalid loan amount'}
      ",
      "next": {"goto": "display_loan_info"}
    },
  
    "display_loan_info": {
      "type": "prompt",
      "say": {
        "text": "Based on your ${loan_type} loan request for ₹${loan_amount}, your monthly EMI would be approximately ₹${monthly_emi} at ${interest_rate}% interest for ${loan_term_years} years.",
        "mode": "deterministic"
      },
      "next": {"goto": "END"}
    },
  
    "account": {
      "type": "prompt",
      "say": {
        "text": "I can help with account-related questions. What specific issue are you facing?",
        "mode": "generative",
        "instructions": ["Be helpful and guide them to account support"]
      },
      "next": {"goto": "END"}
    },
  
    "general": {
      "type": "prompt",
      "say": {
        "text": "I'm here to help with general banking questions. What would you like to know?",
        "mode": "generative",
        "instructions": ["Provide helpful general information"]
      },
      "next": {"goto": "END"}
    },
  
    "END": {
      "type": "end",
      "say": {
        "text": "Thank you for contacting our bank. Is there anything else I can help you with today?",
        "mode": "generative"
      }
    }
  }
}
```

This comprehensive documentation covers all node types in FlowEngineV4, including the new LLM Router node, with practical examples and best practices for building sophisticated conversational AI flows.
