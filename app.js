const express = require("express");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());


const strings = {};

function analyzeString(value) {
  const normalized = value.toLowerCase();
  const length = value.length;
  const is_palindrome =
    normalized === normalized.split("").reverse().join("");
  const unique_characters = new Set(value).size;
  const words = value.trim() ? value.trim().split(/\s+/) : [];
  const word_count = words.length;
  const sha256_hash = crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

  const character_frequency_map = {};
  for (const char of value) {
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

  if (value === undefined) {
    return res.status(400).json({ error: "Missing 'value' field" });
  }

  if (typeof value !== "string") {
    return res.status(422).json({ error: "'value' must be a string" });
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

  const filters_applied = {};

  if (is_palindrome !== undefined) {
    if (is_palindrome !== "true" && is_palindrome !== "false") {
      return res
        .status(400)
        .json({ error: "'is_palindrome' must be 'true' or 'false'" });
    }
    filters_applied.is_palindrome = is_palindrome === "true";
  }

  if (min_length !== undefined) {
    const parsed = Number(min_length);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return res
        .status(400)
        .json({ error: "'min_length' must be a non-negative integer" });
    }
    filters_applied.min_length = parsed;
  }

  if (max_length !== undefined) {
    const parsed = Number(max_length);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return res
        .status(400)
        .json({ error: "'max_length' must be a non-negative integer" });
    }
    filters_applied.max_length = parsed;
  }

  if (
    filters_applied.min_length !== undefined &&
    filters_applied.max_length !== undefined &&
    filters_applied.min_length > filters_applied.max_length
  ) {
    return res
      .status(400)
      .json({ error: "'min_length' cannot be greater than 'max_length'" });
  }

  if (word_count !== undefined) {
    const parsed = Number(word_count);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return res
        .status(400)
        .json({ error: "'word_count' must be a non-negative integer" });
    }
    filters_applied.word_count = parsed;
  }

  if (contains_character !== undefined) {
    if (
      typeof contains_character !== "string" ||
      contains_character.length !== 1
    ) {
      return res.status(400).json({
        error: "'contains_character' must be a single character string",
      });
    }
    filters_applied.contains_character = contains_character;
  }

  if (filters_applied.is_palindrome !== undefined)
    results = results.filter(
      (r) => r.properties.is_palindrome === filters_applied.is_palindrome
    );

  if (filters_applied.min_length !== undefined)
    results = results.filter(
      (r) => r.properties.length >= filters_applied.min_length
    );

  if (filters_applied.max_length !== undefined)
    results = results.filter(
      (r) => r.properties.length <= filters_applied.max_length
    );

  if (filters_applied.word_count !== undefined)
    results = results.filter(
      (r) => r.properties.word_count === filters_applied.word_count
    );

  if (filters_applied.contains_character !== undefined)
    results = results.filter((r) =>
      r.value.includes(filters_applied.contains_character)
    );

  res.json({
    data: results,
    count: results.length,
    filters_applied,
  });
});

app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Missing 'query' parameter" });

  const lower = query.toLowerCase();
  const filters = {};
  let hasConflict = false;

  const setFilter = (key, value) => {
    if (filters[key] !== undefined && filters[key] !== value) {
      hasConflict = true;
    } else {
      filters[key] = value;
    }
  };

  if (lower.includes("palindromic")) setFilter("is_palindrome", true);
  if (lower.includes("single word")) setFilter("word_count", 1);

  const lengthMatch = lower.match(/longer than (\d+)/);
  if (lengthMatch) setFilter("min_length", Number(lengthMatch[1]) + 1);

  if (lower.includes("first vowel")) setFilter("contains_character", "a");

  if (lower.includes("containing the letter")) {
    const char = lower.split("containing the letter ")[1]?.trim()?.[0];
    if (char) setFilter("contains_character", char);
  }

  if (hasConflict)
    return res
      .status(422)
      .json({ error: "Parsed query resulted in conflicting filters" });

  if (Object.keys(filters).length === 0)
    return res
      .status(400)
      .json({ error: "Unable to parse natural language query" });

  let results = Object.values(strings);

  if (filters.is_palindrome !== undefined)
    results = results.filter(
      (r) => r.properties.is_palindrome === filters.is_palindrome
    );

  if (filters.word_count !== undefined)
    results = results.filter(
      (r) => r.properties.word_count === filters.word_count
    );

  if (filters.min_length !== undefined)
    results = results.filter(
      (r) => r.properties.length >= filters.min_length
    );

  if (filters.contains_character !== undefined)
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
