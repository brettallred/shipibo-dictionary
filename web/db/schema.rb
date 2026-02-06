# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_02_05_195939) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "entries", force: :cascade do |t|
    t.string "headword"
    t.string "part_of_speech"
    t.jsonb "variant_forms"
    t.text "etymology"
    t.jsonb "definitions_spanish"
    t.jsonb "definitions_english"
    t.jsonb "examples"
    t.jsonb "synonyms"
    t.jsonb "cross_references"
    t.text "grammatical_notes"
    t.string "scientific_name"
    t.integer "page_number"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["headword"], name: "index_entries_on_headword"
    t.index ["page_number"], name: "index_entries_on_page_number"
  end
end
