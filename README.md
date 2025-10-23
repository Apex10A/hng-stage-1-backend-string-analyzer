##String Analyzer API — HNG Backend Stage 1

A RESTful API service that analyzes strings and stores their computed properties.

🚀 Features

Compute string statistics:

length: number of characters

is_palindrome: checks if the string reads the same forward and backward

unique_characters: count of distinct characters

word_count: total number of words

sha256_hash: hash for unique identification

character_frequency_map: frequency of each character

Retrieve all or specific strings

Filter using query parameters

Filter using natural language queries

Delete stored strings

🧩 Tech Stack

Node.js

Express.js

CORS

Crypto (built-in Node module)

⚙️ Setup Instructions
1️⃣ Clone the Repository
git clone https://github.com/<your-username>/string-analyzer-api.git
cd string-analyzer-api

2️⃣ Install Dependencies
npm install

3️⃣ Run the Server
node server.js


💡 Optional: Use nodemon for auto-restart during development
Install it with:

npm install -g nodemon
nodemon server.js

4️⃣ Confirm It’s Running

You should see:

🚀 Server running on port 5000


Then open your browser or Postman and go to:

http://localhost:5000

🧪 API Endpoints
🔹 1. Analyze & Create String

POST /strings

Request Body

{
  "value": "madam"
}


Response (201 Created)

{
  "id": "abc123hash",
  "value": "madam",
  "properties": {
    "length": 5,
    "is_palindrome": true,
    "unique_characters": 3,
    "word_count": 1,
    "sha256_hash": "abc123...",
    "character_frequency_map": {
      "m": 2,
      "a": 2,
      "d": 1
    }
  },
  "created_at": "2025-10-22T20:00:00Z"
}

🔹 2. Get All Strings

GET /strings

Supports query parameters for filtering:

/strings?is_palindrome=true&min_length=3&max_length=10&word_count=1&contains_character=a


Response

{
  "data": [ /* array of strings */ ],
  "count": 3,
  "filters_applied": {
    "is_palindrome": true,
    "min_length": 3,
    "max_length": 10,
    "word_count": 1,
    "contains_character": "a"
  }
}

🔹 3. Get Specific String

GET /strings/{string_value}

Example:

GET /strings/madam


Response

{
  "id": "abc123hash",
  "value": "madam",
  "properties": { ... },
  "created_at": "2025-10-22T20:00:00Z"
}

🔹 4. Delete String

DELETE /strings/{string_value}

Response

204 No Content

🔹 5. Natural Language Filtering

GET /strings/filter-by-natural-language?query=all%20single%20word%20palindromic%20strings

Example Queries

all single word palindromic strings

strings longer than 10 characters

strings containing the letter z

Response

{
  "data": [ /* array of matching strings */ ],
  "count": 2,
  "interpreted_query": {
    "original": "all single word palindromic strings",
    "parsed_filters": {
      "word_count": 1,
      "is_palindrome": true
    }
  }
}
