const express = require("express");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());


const strings = {};

function analyzeString(value) {
  const cleanValue = value.trim();
  const length = cleanValue.length;
  const is_palindrome =
    cleanValue.toLowerCase() ===
    cleanValue.split("").reverse().join("").toLowerCase();
  const unique_characters = new Set(cleanValue).size;
  const word_count = cleanValue.split(/\s+/).filter(Boolean).length;
  const sha256_hash = crypto
    .createHash("sha256")
    .update(cleanValue)
    .digest("hex");

  const character_frequency_map = {};
  for (const char of cleanValue) {
    character_frequency_map[char] =
      (character_frequency_map[char] || 0) + 1;
  }

  return {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
}

app.post("/strings", (req, res) => {
  const { value } = req.body;

  if (!value || typeof value !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'value' field" });
  }

  const analysis = analyzeString(value);
  const id = analysis.sha256_hash;

  if (strings[id]) {
    return res.status(409).json({ error: "String already exists" });
  }

  const record = {
    id,
    value,
    properties: analysis,
    created_at: new Date().toISOString(),
  };

  strings[id] = record;
  res.status(201).json(record);
});


app.get("/strings/:value", (req, res) => {
  const { value } = req.params;
  const hash = crypto.createHash("sha256").update(value).digest("hex");

  if (!strings[hash]) {
    return res.status(404).json({ error: "String not found" });
  }

  res.json(strings[hash]);
});


app.get("/strings", (req, res) => {
  let results = Object.values(strings);
  const {
    is_palindrome,
    min_length,
    max_length,
    word_count,
    contains_character,
  } = req.query;

  if (is_palindrome !== undefined)
    results = results.filter(
      (r) => r.properties.is_palindrome === (is_palindrome === "true")
    );

  if (min_length)
    results = results.filter(
      (r) => r.properties.length >= Number(min_length)
    );

  if (max_length)
    results = results.filter(
      (r) => r.properties.length <= Number(max_length)
    );

  if (word_count)
    results = results.filter(
      (r) => r.properties.word_count === Number(word_count)
    );

  if (contains_character)
    results = results.filter((r) =>
      r.value.includes(contains_character)
    );

  res.json({
    data: results,
    count: results.length,
    filters_applied: req.query,
  });
});

app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Missing 'query' parameter" });

  let filters = {};
  const lower = query.toLowerCase();

  if (lower.includes("palindromic")) filters.is_palindrome = true;
  if (lower.includes("single word")) filters.word_count = 1;

  const lengthMatch = lower.match(/longer than (\d+)/);
  if (lengthMatch) filters.min_length = Number(lengthMatch[1]);

  if (lower.includes("containing the letter")) {
    const char = lower.split("containing the letter ")[1]?.trim()?.[0];
    if (char) filters.contains_character = char;
  }

  let results = Object.values(strings);

  if (filters.is_palindrome !== undefined)
    results = results.filter(
      (r) => r.properties.is_palindrome === filters.is_palindrome
    );

  if (filters.word_count)
    results = results.filter(
      (r) => r.properties.word_count === filters.word_count
    );

  if (filters.min_length)
    results = results.filter(
      (r) => r.properties.length >= filters.min_length
    );

  if (filters.contains_character)
    results = results.filter((r) =>
      r.value.includes(filters.contains_character)
    );

  res.json({
    data: results,
    count: results.length,
    interpreted_query: {
      original: query,
      parsed_filters: filters,
    },
  });
});

app.delete("/strings/:value", (req, res) => {
  const { value } = req.params;
  const hash = crypto.createHash("sha256").update(value).digest("hex");

  if (!strings[hash]) {
    return res.status(404).json({ error: "String not found" });
  }

  delete strings[hash];
  res.status(204).send();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
