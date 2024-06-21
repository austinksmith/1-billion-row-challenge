require 'time'
require 'concurrent'

class Station
  attr_reader :min, :sum, :max, :count

  def initialize
    @min = Float::INFINITY
    @sum = 0
    @max = -Float::INFINITY
    @count = 0
    @mutex = Mutex.new
  end

  def add_temperature(temp)
    @mutex.synchronize do
      @min = temp if temp < @min
      @max = temp if temp > @max
      @sum += temp
      @count += 1
    end
  end

  def average_temperature
    @count == 0 ? 0 : @sum / @count
  end
end

class ProgressTracker
  def initialize(total_lines)
    @total_lines = total_lines.to_f
    @processed_lines_count = Concurrent::AtomicFixnum.new(0)
  end

  def increment_processed_lines(count = 1)
    @processed_lines_count.update { |value| value + count }
  end

  def print_progress
    current_percentage = (@processed_lines_count.value / @total_lines) * 100
    print "\rProcessing... #{current_percentage.round(2)}% complete"
  end

  def finalize_progress
    puts "\nProcessing completed."
  end
end

stations = Concurrent::Hash.new { |hash, key| hash[key] = Station.new }
total_lines = 1_000_000_000 # Predefined total lines in the file
progress_tracker = ProgressTracker.new(total_lines)

def parse_line(line)
  parts = line.split(';')
  station = parts[0]
  temperature = parts[1].to_f
  [station, temperature]
end

def process_subchunk(subchunk, stations)
  subchunk.each do |line|
    station, temperature = parse_line(line)
    stations[station].add_temperature(temperature)
  end
end

def process_chunk(chunk, stations, subchunk_size, progress_tracker)
  futures = []
  
  chunk.each_slice(subchunk_size) do |subchunk|
    futures << Concurrent::Future.execute { process_subchunk(subchunk, stations) }
  end
  
  futures.each(&:value) # Wait for all futures to complete
  progress_tracker.increment_processed_lines(chunk.size)
  progress_tracker.print_progress
end

def process_data(filename, stations, buffer_size, subchunk_size, total_lines, progress_tracker)
  start_time = Time.now

  pool = Concurrent::FixedThreadPool.new(8) # Adjust the number of threads as needed

  buffer = []

  File.foreach(filename) do |line|
    buffer << line

    if buffer.length >= buffer_size
      chunk_to_process = buffer.shift(buffer_size) # Remove processed lines from buffer immediately
      pool.post { process_chunk(chunk_to_process, stations, subchunk_size, progress_tracker) } # Process the chunk in parallel
    end
  end

  # Process any remaining lines in the buffer
  unless buffer.empty?
    chunk_to_process = buffer.shift(buffer.size) # Remove processed lines from buffer immediately
    pool.post { process_chunk(chunk_to_process, stations, subchunk_size, progress_tracker) } # Process the chunk in parallel
  end

  pool.shutdown
  pool.wait_for_termination

  end_time = Time.now
  puts "\nTotal processing time: #{end_time - start_time} seconds"
  progress_tracker.finalize_progress
  print_data(stations)
end

def print_data(stations)
  sorted_stations = stations.keys.sort
  print '{'
  sorted_stations.each_with_index do |station, index|
    stats = stations[station]
    avg_temp = stats.average_temperature
    print "#{station}=#{format('%.1f', stats.min)}/#{format('%.1f', avg_temp)}/#{format('%.1f', stats.max)}"
    print ',' if index < sorted_stations.length - 1
  end
  print "}\n"
end

# Replace 'measurements.txt' with your actual filename
buffer_size = 10 * (4 * 250000) # Adjust the buffer size as needed
subchunk_size = buffer_size / 8 # Size of each subchunk
process_data('measurements.txt', stations, buffer_size, subchunk_size, total_lines, progress_tracker)
