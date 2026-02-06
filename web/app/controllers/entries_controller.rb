class EntriesController < ApplicationController
  def index
    @letter = params[:letter].to_s.downcase.presence
    @entries = Entry.order(:headword)
    @entries = @entries.where("headword ILIKE :prefix", prefix: "#{@letter}%") if @letter
    @letters = Entry.distinct.pluck(Arel.sql("LEFT(LOWER(REGEXP_REPLACE(headword, '^[-—]', '')), 1)")).compact.sort.uniq
  end

  def show
    @entry = Entry.find(params[:id])
    @related = Entry.where(headword: @entry.synonyms.to_a + @entry.cross_references.to_a)
  end

  def search
    @query = params[:q].to_s.strip

    if @query.present?
      @entries = Entry.where(
        "headword ILIKE :q OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(definitions_spanish) AS d WHERE d ILIKE :q
        ) OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(definitions_english) AS d WHERE d ILIKE :q
        )",
        q: "%#{@query}%"
      ).order(:headword).limit(50)
    else
      @entries = Entry.none
    end

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end
end
